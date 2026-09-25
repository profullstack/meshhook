/**
 * MeshHook database layer — Postgres, through @profullstack/libsql-pg.
 *
 * The exported `db` object keeps the shape it has had since the Postgres days
 * (one / oneOrNone / manyOrNone / none / tx / batch), so call sites did not
 * change across either migration. Underneath, the libSQL client that replaced
 * node-postgres in the Turso era is now @profullstack/libsql-pg: the same
 * execute / batch / transaction surface over a pg pool, with the SQLite idioms
 * the queries picked up on Turso (strftime('%Y-%m-%dT%H:%M:%fZ','now'), `?`
 * placeholders, INSERT OR IGNORE) rewritten per statement.
 *
 *  - Placeholders are `?`. `$n` style is still accepted and rewritten so SQL
 *    carried over from the first Postgres implementation keeps working; see
 *    toLibsqlSql().
 *  - Timestamp columns are TEXT holding ISO-8601 UTC and JSON columns are TEXT,
 *    exactly as on Turso, so the copied rows and the app's string comparisons
 *    line up. Use the json() helper when reading JSON.
 */

import { createClient } from "@profullstack/libsql-pg";
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

const POSTGRES_URL = /^postgres(ql)?:\/\//i;

/**
 * Resolve the Postgres connection string from the environment.
 *
 * DATABASE_URL must be postgres:// or postgresql://. There is deliberately no
 * fallback to a file or libsql:// database: a misconfigured deploy fails here
 * with the reason, rather than writing to the wrong place. The retired Turso
 * setting is recognised only so the error can say what to do about it.
 */
export function resolveConnection(env = process.env) {
  const url = env.DATABASE_URL;
  const legacy = env.TURSO_DATABASE_URL ?? env.LIBSQL_URL;

  if (!url) {
    const hint = legacy
      ? " TURSO_DATABASE_URL is set but no longer read: MeshHook moved from Turso to Postgres. " +
        'Copy the data with `npx libsql-pg copy --from "$TURSO_DATABASE_URL" --token "$TURSO_AUTH_TOKEN" --to "$DATABASE_URL" --verify` and set DATABASE_URL.'
      : " See .env.example.";
    throw new Error(`DATABASE_URL is not set (expected postgres://user:pass@host:5432/meshhook).${hint}`);
  }

  if (!POSTGRES_URL.test(url)) {
    throw new Error(
      `DATABASE_URL must be a postgres:// or postgresql:// URL, got "${url.split(":")[0]}:". ` +
        "MeshHook runs on Postgres only; libsql:// and file: databases are not supported.",
    );
  }

  return { url };
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

/** Row objects carry non-enumerable index keys; give call sites a plain object. */
const plain = (row) => (row ? { ...row } : row);

/**
 * Postgres codes worth one more attempt: a serialization failure or a deadlock
 * victim. Each is safe to retry because the statement or transaction it
 * interrupted was rolled back whole. (The SQLite_BUSY handling and the
 * in-process write lock this replaced were for libSQL's single connection; the
 * pg pool needs neither.)
 */
const RETRY_CODES = new Set(["40001", "40P01"]);

function isRetryable(error) {
  const code = error?.code ?? error?.cause?.code;
  return Boolean(code && RETRY_CODES.has(code));
}

async function withRetry(fn, { attempts = 5, baseDelayMs = 5, maxDelayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
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

/** Lazily create the shared client so importing this module never connects. */
export function getClient() {
  if (!client) {
    const { url } = resolveConnection();
    client = createClient({ url });
  }
  return client;
}

/**
 * Run `fn` inside a transaction on one pooled connection, committing on
 * success and rolling back on throw. The whole transaction is retried on a
 * serialization failure or deadlock, so `fn` must be safe to run more than once.
 */
function transactional(getter) {
  return (fn) =>
    withRetry(async () => {
      const trx = await getter().transaction("write");
      try {
        const tdb = wrap((sql, params) =>
          trx.execute({ sql: toLibsqlSql(sql), args: bindAll(params) }),
        );
        const res = await fn(tdb);
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
    });
}

const execute = (sql, params) =>
  withRetry(() => getClient().execute({ sql: toLibsqlSql(sql), args: bindAll(params) }));

export const db = {
  ...wrap(execute),

  /**
   * Run `fn` inside a transaction. The handle passed to `fn` exposes the full
   * query API (one / oneOrNone / manyOrNone / none).
   */
  tx: transactional(getClient),

  /**
   * Execute several statements atomically, one result per statement. Thin
   * wrapper over the libSQL-style batch API.
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

  /** Close the pool. Mainly for tests and one-shot scripts. */
  close: async () => {
    if (client) {
      await client.close();
      client = undefined;
    }
  },
};

/**
 * Build an isolated db handle against an explicit Postgres URL, bypassing the
 * shared client. Tests use this for throwaway schemas (see createTestDb in
 * src/queue/test-helpers.js). `pool` exposes the underlying pg pool for DDL
 * that should run as written rather than through the SQLite rewriter.
 */
export function createDb({ url } = {}) {
  if (!url) {
    throw new Error("createDb requires a postgres:// url");
  }
  if (!POSTGRES_URL.test(url)) {
    throw new Error(`createDb: url must be postgres:// or postgresql://, got "${url.split(":")[0]}:"`);
  }

  const local = createClient({ url });
  const exec = (sql, params) =>
    withRetry(() => local.execute({ sql: toLibsqlSql(sql), args: bindAll(params) }));

  return {
    ...wrap(exec),
    tx: transactional(() => local),
    batch: async (statements) =>
      local.batch(
        statements.map((s) =>
          typeof s === "string"
            ? { sql: toLibsqlSql(s), args: [] }
            : { sql: toLibsqlSql(s.sql), args: bindAll(s.args) },
        ),
        "write",
      ),
    pool: local.pool,
    close: async () => local.close(),
  };
}
