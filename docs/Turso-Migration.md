# Migrating from Supabase to Turso

MeshHook originally stored everything in Supabase: Postgres for data, RLS for
tenant isolation, pgmq for the job queue, Supabase Auth for users and sessions,
and Supabase Realtime for the live log view. It now runs on
[Turso](https://turso.tech) (libSQL/SQLite).

SQLite is not a smaller Postgres — several things Supabase provided as platform
features had to be rebuilt. This is what changed and why.

## At a glance

| Concern | Before | After |
|---|---|---|
| Driver | `pg.Pool` | `@libsql/client` |
| Placeholders | `$1, $2` | `?` (translated automatically) |
| Migrations | `supabase db push` | `node scripts/db-migrate.js` |
| Tenant isolation | Row Level Security | `packages/shared/lib/authz.js` |
| Auth | Supabase Auth (JWT) | `packages/shared/lib/auth.js` (sessions) |
| Job queue | pgmq extension | `packages/shared/lib/queue.js` |
| Live logs | Supabase Realtime | Server-Sent Events |
| Secret encryption | *(claimed, never implemented)* | AES-256-GCM in `crypto.js` |
| Event storage | Monthly partitions | Single table + indexes |

## Type mapping

SQLite has a much smaller type system. The migrations in `migrations/` use:

| Postgres | SQLite | Notes |
|---|---|---|
| `uuid` | `text` | Default generates a v4 via `randomblob()` |
| `jsonb` | `text` | Read with the `json()` helper from `db.js` |
| `timestamptz` | `text` | ISO-8601 UTC, e.g. `2026-08-11T12:00:00.000Z` |
| `bytea` | `blob` | |
| `bigserial` | `integer primary key` | Rowid alias, autoincrements |
| `inet` | `text` | |
| `boolean` | `integer` | `0`/`1`, with a check constraint |

Anything that read a `jsonb` column now gets a string. `db.json(value)` decodes
it and passes objects through untouched, so it is safe to apply everywhere.

## Row Level Security is gone

This is the most important change to understand.

Under Supabase, every table carried RLS policies keyed on `auth.uid()`. A query
that forgot its `where owner = ...` clause still returned only the caller's
rows — the database was the backstop.

**SQLite has no RLS, and Turso has no concept of the calling user.** An
unfiltered query now returns every tenant's data.

The policies were replaced by query helpers in `packages/shared/lib/authz.js`,
which apply the same rule the policies did:

```
projects              owner = current user
secrets               project_id ∈ the user's projects
workflow_definitions  project_id ∈ the user's projects
workflow_runs         project_id ∈ the user's projects
workflow_events       run_id → workflow_runs → the user's projects
audit_log             project_id ∈ the user's projects
```

Route handlers should use those helpers. Where a bespoke query is unavoidable,
embed `ownedProjectIdsSql()` so the predicate stays in one place:

```js
const rows = await db.manyOrNone(
  `select * from secrets where project_id in (${ownedProjectIdsSql()})`,
  [user.id],
);
```

Cross-tenant access is covered by tests in `packages/shared/lib/auth.test.js`.

## Authentication

Supabase Auth handled signup, login, JWT issuance and cookie refresh. MeshHook
now owns all of it:

- Passwords use **scrypt** (`node:crypto`, N=16384) — no new dependency.
- Sessions are opaque 256-bit tokens. Only the **SHA-256 of the token** is
  stored, so a database leak cannot be replayed as a login.
- Sessions are rows, not JWTs, so **logout revokes immediately**. The old access
  tokens stayed valid until they expired.
- Login and signup are SvelteKit **form actions**; credentials never pass
  through client-side JavaScript.

Sessions last 30 days and slide forward when used.

**Not carried over:** Supabase sent a confirmation email on signup. There is no
mail provider here, so accounts are usable immediately and `users.email_verified`
stays `0`. Email verification is tracked as issue #47.

## Job queue

pgmq is a Postgres extension with no SQLite equivalent, and the old code reached
it through Supabase RPC (`client.rpc('pgmq_send', …)`), so transport and
implementation both had to be replaced.

The visibility-timeout model is preserved exactly: a message is available when
`vt <= now`, reading pushes `vt` forward and increments `read_ct`, and an
unacknowledged message becomes visible again when its lease lapses. pgmq's
per-queue table pairs (`q_<name>` / `a_<name>`) became a single `queue_messages`
table with a `queue_name` column, since SQLite has no schemas.

### Concurrency: the write lock

pgmq relied on `FOR UPDATE SKIP LOCKED` for atomic claims. SQLite has no row
locks, and `@libsql/client` multiplexes every statement over **one** connection.
Two overlapping write transactions therefore interleave on that connection: the
loser gets `SQLITE_BUSY` on `BEGIN`, and the winner then fails its `COMMIT` with
*"cannot commit transaction - SQL statements in progress"*.

Retrying alone **livelocks** — each retry recreates the interleaving that breaks
the in-flight commit.

`db.js` therefore serialises all top-level statements and transactions through an
in-process write lock, and retries with backoff on top for cross-process
contention. SQLite permits one writer at a time regardless, so this costs no real
concurrency. The `concurrent consumers` test in `src/queue/integration.test.js`
covers it.

## Live logs

Supabase Realtime replicated Postgres INSERTs over a websocket. The replacement
is an SSE endpoint at `/api/runs/[id]/events` that polls `workflow_events` for
rows past the last id it sent.

Events are append-only with a monotonic integer id, so "everything after N" is an
index lookup, and SSE reconnects on its own with `Last-Event-ID` — a client that
drops out resumes exactly where it left off. The stream closes once the run
reaches a terminal state.

## Event partitioning

`workflow_events` was range-partitioned by month, with a job creating future
partitions and dropping old ones. SQLite has no declarative partitioning. The
equivalent win comes from the `(run_id, ts)` index, which is what every replay
query uses. Retention is a delete by age rather than a partition drop.

## Bugs found during the migration

Several pre-existing faults surfaced while porting, and were fixed:

- **Secrets were stored in plaintext.** `POST /api/secrets` inserted the raw
  value with a comment claiming "encryption handled by database trigger". No such
  trigger existed in any migration. Values are now encrypted with AES-256-GCM
  before they reach the database.
- **`POST /api/secrets` could never have worked** — it wrote columns (`name`,
  `encrypted_value`, `description`) that the table does not have.
- **`/api/workflows/[id]/versions` queried a `workflow_versions` table** that no
  migration ever created. Versioning actually lives in `workflow_definitions`
  rows sharing `(project_id, slug)`.
- **Publishing was not atomic.** Inserting the new version and archiving the
  draft were separate requests, so a failure between them left a workflow both
  published and un-archived. They now share a transaction.
- **The webhook route imported `enqueueRun`** from a module that never exported
  it, and enqueued onto an in-process EventEmitter that a separately deployed
  orchestrator could not observe. Jobs now go onto the real queue.
- **Webhook signature comparison used `!==`**, leaking the position of the first
  differing byte through timing. It is now constant-time.
- **`/api/runs` and `runs/[id]` queried `runs`, `logs` and `events` tables** that
  do not exist; the real tables are `workflow_runs` and `workflow_events`.
- **The root `.env` was never read** — `db.js` resolved the repo root one
  directory short, landing in `packages/`.

## Operational notes

- **`:memory:` does not work** with `@libsql/client`: each connection gets its
  own empty database, so schema created by one statement is invisible to the
  next. Tests use a temp file instead; `createDb` rejects `:memory:` outright.
- **Foreign keys** are per-connection in SQLite. `scripts/verify-migration.js`
  reports the pragma state, since cascade deletes silently do nothing when off.
- **`@libsql/client` is marked external** in `apps/web/vite.config.js` — it loads
  a platform-specific native binding via dynamic `require`, which Rollup cannot
  bundle.
- **Railway builds need `packageManager` in `package.json` and a committed
  `pnpm-lock.yaml`.** Without them Railpack falls back to `npm install`, which
  cannot resolve pnpm's `workspace:*` protocol. `pnpm-lock.yaml` was previously
  gitignored, which is what broke the build.

## Environment variables

Replaced:

```
DATABASE_URL=postgresql://...        ->  TURSO_DATABASE_URL=libsql://...
SUPABASE_URL=...                         TURSO_AUTH_TOKEN=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
```

Added:

```
SECRETS_ENCRYPTION_KEY=   # openssl rand -hex 32
```

`DATABASE_URL` is still accepted as an alias for `TURSO_DATABASE_URL`, but a
`postgres://` value is rejected with an explicit error rather than failing later
with an opaque protocol mismatch.

Losing `SECRETS_ENCRYPTION_KEY` makes every stored secret unrecoverable. Back it
up; `scripts/setup.js` preserves an existing key when re-run.

## Data migration

These instructions cover schema and application changes only. There is **no
automated data migration** from an existing Supabase instance — the type
changes (uuid, jsonb, timestamptz) and the auth model change mean rows cannot be
copied verbatim, and password hashes held by Supabase Auth cannot be exported in
a form scrypt can verify. Existing users would need to reset their passwords.
