/**
 * MeshHook database layer — libSQL / Turso.
 *
 * Replaces the previous node-postgres pool. The exported `db` object keeps the
 * same shape it had under Postgres (one / oneOrNone / manyOrNone / none / tx)
 * so call sites did not have to change, but two things differ underneath:
 *
 *  - Placeholders are `?`, not `$1`. `$n` style is still accepted and rewritten
 *    so migrated SQL keeps working; see toLibsqlSql().
 *  - SQLite has no jsonb/uuid/timestamptz. JSON columns come back as TEXT, so
 *    use the json() helper when reading them.
 */

import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// packages/shared/lib -> repo root. The Postgres version stopped one level
// short at packages/, so the root .env was never actually read.
const rootDir = join(__dirname, "../../..");

// .env wins (production), .env.local is the committed dev default.
config({ path: join(rootDir, ".env") });
config({ path: join(rootDir, ".env.local") });

/**
 * Resolve the libSQL connection settings from the environment.
 *
 * TURSO_DATABASE_URL + TURSO_AUTH_TOKEN is the production path. DATABASE_URL is
 * accepted as an alias so existing deploys can be repointed by changing one
 * value, but a `postgres://` URL is rejected outright rather than failing later
 * with an opaque protocol error.
 */
export function resolveConnection(env = process.env) {
  const url = env.TURSO_DATABASE_URL ?? env.DATABASE_URL ?? env.LIBSQL_URL;

  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Set it to a libsql:// URL (Turso), " +
        "or a file: URL for local development. See .env.example.",
    );
  }

  if (/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(
      `Refusing to connect: "${url.split("@").pop()}" looks like a Postgres URL. ` +
        "MeshHook migrated from Supabase/Postgres to Turso (libSQL). " +
        "Set TURSO_DATABASE_URL to a libsql:// or file: URL.",
    );
  }

  const authToken = env.TURSO_AUTH_TOKEN ?? env.LIBSQL_AUTH_TOKEN;

  // Remote libsql:// and https:// databases require a token; file: does not.
  if (/^(libsql|https?):\/\//i.test(url) && !authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN is required for remote libSQL URLs. " +
        "Generate one with: turso db tokens create <database>",
    );
  }

  return { url, authToken };
}

/**
 * Rewrite Postgres `$1` placeholders to libSQL `?`.
 *
 * libSQL binds positional `?` in order, so this is only safe when the `$n` are
 * already in ascending order with no repeats — which is true of all SQL carried
 * over from the Postgres implementation. A repeated or out-of-order `$n` would
 * silently bind the wrong value, so it throws instead.
 *
 * Placeholders inside string literals, quoted identifiers and comments are left
 * alone.
 */
export function toLibsqlSql(sql) {
  if (!sql.includes("$")) return sql;

  let out = "";
  let expected = 1;
  let seenPositional = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // Skip over anything where a `$n` would not be a placeholder.
    if (ch === "'" || ch === '"' || ch === "`") {
      const end = skipQuoted(sql, i, ch);
      out += sql.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      out += sql.slice(i, stop);
      i = stop - 1;
      continue;
    }
    if (ch === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      out += sql.slice(i, stop);
      i = stop - 1;
      continue;
    }

    if (ch === "$" && /[0-9]/.test(sql[i + 1] ?? "")) {
      let j = i + 1;
      while (j < sql.length && /[0-9]/.test(sql[j])) j++;
      const n = Number(sql.slice(i + 1, j));

      if (n !== expected) {
        throw new Error(
          `Cannot translate SQL to libSQL: expected $${expected} but found $${n}. ` +
            "Positional parameters must appear in ascending order without repeats. " +
            "Rewrite the query using `?` and pass the argument twice if needed.",
        );
      }

      out += "?";
      expected++;
      seenPositional = true;
      i = j - 1;
      continue;
    }

    out += ch;
  }

  return seenPositional ? out : sql;
}

/** Advance past a quoted string/identifier starting at `start`, handling doubled-quote escapes. */
function skipQuoted(sql, start, quote) {
  let i = start + 1;
  while (i < sql.length) {
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2; // escaped quote
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return sql.length;
}

/**
 * Coerce JS values into something libSQL can bind.
 *
 * SQLite has no native boolean, date or JSON type. Postgres accepted these
 * directly, so normalise here rather than at every call site.
 */
export function toBindable(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

const bindAll = (params) => (params ?? []).map(toBindable);

/**
 * Parse a JSON/TEXT column back into a value.
 *
 * Columns that were `jsonb` under Postgres arrive as strings. Values that are
 * already objects (or null) pass straight through so this is safe to apply
 * unconditionally.
 */
export function json(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** ISO-8601 UTC timestamp — the stored representation for every former timestamptz column. */
export const now = () => new Date().toISOString();

/** Row objects from libSQL are null-prototype; give call sites a plain object. */
const plain = (row) => (row ? { ...row } : row);

/**
 * SQLite allows a single writer at a time. When a second writer arrives it gets
 * SQLITE_BUSY immediately rather than queueing, which matters here because
 * several workers poll the same queue concurrently and each dequeue is a write
 * transaction.
 *
 * Postgres solved this with row-level locks; the equivalent is to wait and try
 * again. Retries use exponential backoff with jitter so competing writers do
 * not resynchronise on the same retry instant.
 */
const BUSY_CODES = new Set(["SQLITE_BUSY", "SQLITE_LOCKED", "SQLITE_BUSY_SNAPSHOT"]);

function isBusy(error) {
  const code = error?.code ?? error?.cause?.code;
  if (code && BUSY_CODES.has(code)) return true;
  // Remote libSQL surfaces contention as a message rather than a code.
  return /database is locked|SQLITE_BUSY/i.test(error?.message ?? "");
}

/**
 * Serialise write transactions within this process.
 *
 * @libsql/client multiplexes every statement over a single underlying
 * connection. Two overlapping `transaction("write")` calls therefore interleave
 * on that one connection: the loser gets SQLITE_BUSY on BEGIN, and — worse —
 * the winner then fails its COMMIT with "cannot commit transaction - SQL
 * statements in progress". Retrying alone livelocks, because each retry
 * re-creates the interleaving that breaks the in-flight commit.
 *
 * SQLite permits one writer at a time regardless, so queueing write
 * transactions behind one another costs no real concurrency. Contention with
 * *other processes* is still handled by withBusyRetry.
 *
 * Returns a function that runs `fn` once the previous caller has settled.
 */
function createWriteLock() {
  let tail = Promise.resolve();

  return (fn) => {
    // Chain on settlement, not success, so one failed transaction does not
    // wedge every later one.
    const result = tail.then(fn, fn);
    tail = result.then(
      () => {},
      () => {},
    );
    return result;
  };
}

async function withBusyRetry(fn, { attempts = 8, baseDelayMs = 5, maxDelayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isBusy(error)) throw error;
      lastError = error;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      await new Promise((r) => setTimeout(r, backoff / 2 + Math.random() * (backoff / 2)));
    }
  }

  throw lastError;
}

function wrap(executor) {
  return {
    /** First row of the result. Throws if the query matched nothing. */
    one: async (q, p = []) => {
      const { rows } = await executor(q, p);
      if (rows.length === 0) {
        throw new Error("Expected exactly one row, got none");
      }
      return plain(rows[0]);
    },
    /** First row, or null when the query matched nothing. */
    oneOrNone: async (q, p = []) => {
      const { rows } = await executor(q, p);
      return rows.length ? plain(rows[0]) : null;
    },
    /** All matching rows (possibly empty). */
    manyOrNone: async (q, p = []) => {
      const { rows } = await executor(q, p);
      return rows.map(plain);
    },
    /** Run a statement for its side effects; returns rowsAffected/lastInsertRowid. */
    none: async (q, p = []) => {
      const res = await executor(q, p);
      return {
        rowsAffected: res.rowsAffected ?? 0,
        lastInsertRowid: res.lastInsertRowid ?? null,
      };
    },
  };
}

let client;

/** Lazily create the shared libSQL client so importing this module never connects. */
export function getClient() {
  if (!client) {
    const { url, authToken } = resolveConnection();
    client = createClient({ url, authToken });
  }
  return client;
}

/** Guards every top-level statement and transaction on the shared client. */
const sharedWriteLock = createWriteLock();

// Standalone statements take the lock too, not just transactions. They share
// the one connection, so an unlocked INSERT issued while a transaction is open
// interleaves with it and makes that transaction's COMMIT fail with "SQL
// statements in progress". Statements *inside* a transaction bypass the lock —
// they run on the transaction handle, whose caller already holds it, so there
// is no re-entrancy deadlock.
const execute = (sql, params) =>
  sharedWriteLock(() =>
    withBusyRetry(() => getClient().execute({ sql: toLibsqlSql(sql), args: bindAll(params) })),
  );

export const db = {
  ...wrap(execute),

  /**
   * Run `fn` inside a transaction, committing on success and rolling back on
   * throw. The handle passed to `fn` exposes the full query API — the Postgres
   * version only offered one/none, which forced awkward workarounds at a few
   * call sites.
   */
  tx: (fn) =>
    // Serialised against other writers in this process, then retried on
    // cross-process contention. The whole transaction is retried, not just the
    // failing statement — a partial transaction is rolled back first, so `fn`
    // must be safe to run more than once.
    sharedWriteLock(() =>
    withBusyRetry(async () => {
      const trx = await getClient().transaction("write");
      try {
        const tdb = wrap((sql, params) =>
          trx.execute({ sql: toLibsqlSql(sql), args: bindAll(params) }),
        );
        const res = await fn(tdb);
        await trx.commit();
        return res;
      } catch (e) {
        // A transaction already closed by a failed commit cannot be rolled back.
        try {
          await trx.rollback();
        } catch {
          /* already closed */
        }
        throw e;
      }
    }),
    ),

  /**
   * Execute several statements atomically. Thin wrapper over the libSQL batch
   * API, used by the migration runner.
   */
  batch: async (statements) =>
    getClient().batch(
      statements.map((s) =>
        typeof s === "string"
          ? { sql: toLibsqlSql(s), args: [] }
          : { sql: toLibsqlSql(s.sql), args: bindAll(s.args) },
      ),
      "write",
    ),

  /** Close the underlying connection. Mainly for tests and one-shot scripts. */
  close: async () => {
    if (client) {
      client.close();
      client = undefined;
    }
  },
};

/**
 * Build an isolated db handle against an explicit URL, bypassing the shared
 * client. Tests use this for throwaway databases.
 *
 * Do not pass a bare ":memory:" — @libsql/client opens a fresh, empty in-memory
 * database for each connection it makes, so a table created by one statement is
 * invisible to the next and every transaction starts blank. Use a temporary
 * file (see createTestDb in src/queue/test-helpers.js), or
 * "file::memory:?cache=shared" if a single process-wide database is genuinely
 * what you want.
 */
export function createDb({ url, authToken } = {}) {
  if (!url) {
    throw new Error("createDb requires a url (e.g. file:/tmp/test.db)");
  }
  if (url === ":memory:") {
    throw new Error(
      'createDb cannot use ":memory:" — @libsql/client gives each connection its own ' +
        'empty database. Use a temp file, or "file::memory:?cache=shared".',
    );
  }

  const local = createClient({ url, authToken });
  // Each handle gets its own lock, matching its own connection.
  const writeLock = createWriteLock();

  const exec = (sql, params) =>
    writeLock(() =>
      withBusyRetry(() => local.execute({ sql: toLibsqlSql(sql), args: bindAll(params) })),
    );

  return {
    ...wrap(exec),
    tx: (fn) =>
      writeLock(() =>
        withBusyRetry(async () => {
          const trx = await local.transaction("write");
          try {
            const res = await fn(
              wrap((sql, params) =>
                trx.execute({ sql: toLibsqlSql(sql), args: bindAll(params) }),
              ),
            );
            await trx.commit();
            return res;
          } catch (e) {
            try {
              await trx.rollback();
            } catch {
              /* already closed */
            }
            throw e;
          }
        }),
      ),
    batch: async (statements) =>
      local.batch(
        statements.map((s) =>
          typeof s === "string"
            ? { sql: toLibsqlSql(s), args: [] }
            : { sql: toLibsqlSql(s.sql), args: bindAll(s.args) },
        ),
        "write",
      ),
    close: async () => local.close(),
  };
}
