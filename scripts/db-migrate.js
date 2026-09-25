#!/usr/bin/env node

/**
 * MeshHook migration runner (Postgres).
 *
 * Applies the SQL in migrations-pg/ over the shared client's pg pool, each file
 * in one transaction. DATABASE_URL must be postgres:// (the app accepts nothing
 * else). The SQLite files in migrations/ stay in the tree until the Turso
 * cutover is proven; they are not applied by this script.
 *
 * Applied migrations are recorded in schema_migrations along with a checksum,
 * so re-running is a no-op and editing an already-applied file is reported as
 * an error rather than silently ignored.
 *
 * Usage:
 *   node scripts/db-migrate.js            apply pending migrations
 *   node scripts/db-migrate.js --status   list applied/pending, apply nothing
 *   node scripts/db-migrate.js --dry-run  show what would run
 *   node scripts/db-migrate.js --force    apply even if a checksum changed
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getClient, resolveConnection } from "@meshhook/shared/lib/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const migrationsDir = join(rootDir, "migrations-pg");

const args = new Set(process.argv.slice(2));
const statusOnly = args.has("--status");
const dryRun = args.has("--dry-run");
const force = args.has("--force");

const checksum = (sql) => createHash("sha256").update(sql).digest("hex").slice(0, 16);

/**
 * Split a migration file into individual statements.
 *
 * Used for the statement count in the log (the file itself is sent to Postgres
 * whole). A naive split on ";" breaks CREATE TRIGGER / CREATE FUNCTION bodies,
 * so BEGIN…END blocks and $$-quoted bodies are kept intact, and string literals
 * and comments are skipped so a ";" inside either is not treated as a boundary.
 */
export function splitStatements(sql) {
  const statements = [];
  let current = "";
  let depth = 0; // BEGIN…END nesting inside a trigger body

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // A $$-quoted function body is one token.
    if (ch === "$" && sql[i + 1] === "$") {
      const end = sql.indexOf("$$", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      current += sql.slice(i, stop);
      i = stop - 1;
      continue;
    }

    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          break;
        }
        j++;
      }
      current += sql.slice(i, j + 1);
      i = j;
      continue;
    }

    if (ch === "-" && sql[i + 1] === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      current += sql.slice(i, stop);
      i = stop - 1;
      continue;
    }

    // Track BEGIN/END only at word boundaries so "begins" or a column named
    // "end" does not shift the depth.
    const rest = sql.slice(i);
    const beginMatch = /^\bbegin\b/i.exec(rest);
    if (beginMatch && !/^\bbegin\s+(transaction|deferred|immediate|exclusive)\b/i.test(rest)) {
      depth++;
      current += beginMatch[0];
      i += beginMatch[0].length - 1;
      continue;
    }
    const endMatch = /^\bend\b/i.exec(rest);
    if (endMatch && depth > 0) {
      depth--;
      current += endMatch[0];
      i += endMatch[0].length - 1;
      continue;
    }

    if (ch === ";" && depth === 0) {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) statements.push(current.trim());
  return statements.filter((s) => !/^(--[^\n]*\n?)*$/.test(s));
}

async function ensureLedger() {
  // Plain Postgres DDL through the pool, not the SQLite rewriter.
  await getClient().pool.query(`
    create table if not exists schema_migrations (
      version text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

function loadMigrations() {
  if (!existsSync(migrationsDir)) {
    throw new Error(`No migrations directory at ${migrationsDir}`);
  }
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort() // zero-padded numeric prefixes make lexical order correct
    .map((file) => {
      const sql = readFileSync(join(migrationsDir, file), "utf8");
      return { version: file.replace(/\.sql$/, ""), file, sql, checksum: checksum(sql) };
    });
}

async function main() {
  console.log("🔄 MeshHook database migration (Postgres)\n");

  // Fails fast with the reason when DATABASE_URL is missing or not Postgres.
  const { url } = resolveConnection();
  // Never print credentials; host and database identify the target.
  console.log(`📍 Target: ${url.replace(/\/\/[^@/]*@/, "//")}\n`);

  await ensureLedger();

  const applied = new Map(
    (await db.manyOrNone("select version, checksum from schema_migrations")).map((r) => [
      r.version,
      r.checksum,
    ]),
  );

  const migrations = loadMigrations();
  const pending = [];
  const drifted = [];

  for (const m of migrations) {
    const prior = applied.get(m.version);
    if (prior === undefined) {
      pending.push(m);
    } else if (prior !== m.checksum) {
      drifted.push(m);
    }
  }

  if (statusOnly) {
    for (const m of migrations) {
      const prior = applied.get(m.version);
      const mark =
        prior === undefined ? "pending" : prior === m.checksum ? "applied" : "CHANGED";
      console.log(`  ${mark.padEnd(8)} ${m.file}`);
    }
    console.log(`\n${applied.size} applied, ${pending.length} pending, ${drifted.length} changed`);
    await db.close();
    return;
  }

  if (drifted.length && !force) {
    console.error("❌ These migrations changed after being applied:\n");
    for (const m of drifted) console.error(`   ${m.file}`);
    console.error(
      "\nEditing an applied migration leaves environments inconsistent. Add a new\n" +
        "migration instead, or re-run with --force if you know the target is disposable.",
    );
    process.exitCode = 1;
    await db.close();
    return;
  }

  const toRun = force ? [...pending, ...drifted] : pending;

  if (toRun.length === 0) {
    console.log("✅ Database is up to date — nothing to apply.");
    await db.close();
    return;
  }

  for (const m of toRun) {
    const statements = splitStatements(m.sql);
    console.log(`${dryRun ? "🔍" : "▶️ "} ${m.file} (${statements.length} statements)`);

    if (dryRun) continue;

    // Each migration is atomic: Postgres DDL is transactional, so a failure
    // part-way leaves nothing behind. The file runs as written (it is already
    // Postgres SQL) on one connection, not through the SQLite rewriter.
    const conn = await getClient().pool.connect();
    try {
      await conn.query("begin");
      await conn.query(m.sql);
      await conn.query(
        `insert into schema_migrations (version, checksum) values ($1, $2)
         on conflict (version) do update set checksum = excluded.checksum, applied_at = now()`,
        [m.version, m.checksum],
      );
      await conn.query("commit");
      console.log(`   ✅ applied`);
    } catch (error) {
      await conn.query("rollback").catch(() => {});
      console.error(`   ❌ failed: ${error.message}`);
      throw error;
    } finally {
      conn.release();
    }
  }

  console.log(`\n✅ ${dryRun ? "Would apply" : "Applied"} ${toRun.length} migration(s).`);
  await db.close();
}

// Only run when invoked directly, so splitStatements stays unit-testable.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`\n❌ Migration failed: ${error.message}`);
    process.exit(1);
  });
}
