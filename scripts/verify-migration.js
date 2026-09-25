#!/usr/bin/env node

/**
 * Verify that the database schema matches what the application expects.
 *
 * Checks every table, view and index the migrations create, plus the seeded
 * queue config, against a Postgres database (information_schema / pg_indexes).
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
  const sql = {
    table: "select table_name as name from information_schema.tables where table_schema = current_schema() and table_type = 'BASE TABLE'",
    view: "select table_name as name from information_schema.views where table_schema = current_schema()",
    index: "select indexname as name from pg_indexes where schemaname = current_schema()",
  }[type];
  const rows = await db.manyOrNone(sql);
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
