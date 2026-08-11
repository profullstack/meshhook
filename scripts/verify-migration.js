#!/usr/bin/env node

/**
 * Verify that the database schema matches what the application expects.
 *
 * The Postgres version checked for RLS policies, partitions and pgmq queues.
 * None of those exist on SQLite, so this checks the things that do: every
 * table, view and index the migrations create, plus the seeded queue config.
 *
 * Usage: node scripts/verify-migration.js
 * Exits non-zero when anything is missing.
 */

import { db } from "@meshhook/shared/lib/db.js";

const EXPECTED_TABLES = [
  "audit_log",
  "job_tracking",
  "projects",
  "queue_archive",
  "queue_config",
  "queue_messages",
  "schema_migrations",
  "secrets",
  "sessions",
  "user_settings",
  "users",
  "workflow_definitions",
  "workflow_events",
  "workflow_runs",
];

const EXPECTED_VIEWS = ["workflows"];

/** Indexes that carry a hot path; a missing one is a performance regression. */
const EXPECTED_INDEXES = [
  "idx_workflow_events_run_ts",
  "idx_workflow_runs_project_started",
  "idx_queue_messages_claim",
  "idx_sessions_expires_at",
  "idx_users_email",
];

const EXPECTED_QUEUES = ["workflow_jobs", "workflow_jobs_dlq"];

async function namesOfType(type) {
  const rows = await db.manyOrNone(
    "select name from sqlite_master where type = ? and name not like 'sqlite_%'",
    [type],
  );
  return new Set(rows.map((r) => r.name));
}

function report(label, expected, actual) {
  const missing = expected.filter((name) => !actual.has(name));

  if (missing.length === 0) {
    console.log(`✅ ${label}: all ${expected.length} present`);
    return true;
  }

  console.error(`❌ ${label}: missing ${missing.join(", ")}`);
  return false;
}

async function main() {
  console.log("🔍 Verifying MeshHook schema\n");

  let ok = true;

  ok = report("Tables", EXPECTED_TABLES, await namesOfType("table")) && ok;
  ok = report("Views", EXPECTED_VIEWS, await namesOfType("view")) && ok;
  ok = report("Indexes", EXPECTED_INDEXES, await namesOfType("index")) && ok;

  const queues = await db.manyOrNone("select queue_name from queue_config");
  ok = report("Queue config", EXPECTED_QUEUES, new Set(queues.map((q) => q.queue_name))) && ok;

  const applied = await db.manyOrNone(
    "select version from schema_migrations order by version",
  );
  console.log(
    `\n📦 ${applied.length} migration(s) applied: ${applied.map((m) => m.version).join(", ") || "none"}`,
  );

  // Foreign keys are off by default in SQLite; the app relies on cascades, so
  // flag it rather than let deletes silently orphan rows.
  const [{ foreign_keys: fkEnabled }] = await db.manyOrNone("pragma foreign_keys");
  if (!fkEnabled) {
    console.log(
      "\nℹ️  foreign_keys pragma is OFF for this connection. libSQL enables it " +
        "per-connection; cascade deletes will not fire while it is off.",
    );
  }

  await db.close();

  if (!ok) {
    console.error("\n❌ Schema verification failed. Run: pnpm run db:migrate");
    process.exit(1);
  }

  console.log("\n✅ Schema verification passed.");
}

main().catch(async (error) => {
  console.error(`\n❌ Verification failed: ${error.message}`);
  process.exit(1);
});
