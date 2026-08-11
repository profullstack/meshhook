/**
 * Test helpers for the queue suite.
 *
 * Each test gets its own throwaway libSQL database with the real migrations
 * applied. The previous tests pointed a Supabase client at localhost:54321 and
 * only passed when a local Supabase stack happened to be running, so they were
 * never exercised in CI. These need nothing but Node.
 *
 * The database is a temp file rather than ":memory:" because @libsql/client
 * hands each connection its own empty in-memory database — schema created on
 * one connection is invisible to the next, and every transaction would start
 * blank. A file also keeps concurrently-running test files isolated from each
 * other, which "file::memory:?cache=shared" would not.
 */

import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createDb } from "@meshhook/shared/lib/db.js";
import { splitStatements } from "../../scripts/db-migrate.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");

/**
 * Create a fresh database with the full schema applied.
 * @returns {Promise<object>} A db handle; close() also deletes the temp file.
 */
export async function createTestDb() {
  const dir = mkdtempSync(join(tmpdir(), "meshhook-test-"));
  const db = createDb({ url: `file:${join(dir, `${randomUUID()}.db`)}` });

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    for (const statement of splitStatements(sql)) {
      await db.none(statement);
    }
  }

  const close = db.close;
  db.close = async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
  };

  return db;
}

/**
 * Insert a project, workflow definition and run, returning their ids.
 *
 * job_tracking has a foreign key onto workflow_runs, so a queue test that
 * enqueues anything needs a real run to point at.
 */
export async function seedRun(db, { status = "running" } = {}) {
  const project = await db.one(
    `insert into projects (owner, name) values (?, ?) returning id`,
    ["11111111-1111-4111-8111-111111111111", "test-project"],
  );

  const workflow = await db.one(
    `insert into workflow_definitions (project_id, slug, name, definition)
     values (?, ?, ?, ?) returning id`,
    [project.id, "test-workflow", "Test Workflow", JSON.stringify({ nodes: [] })],
  );

  const run = await db.one(
    `insert into workflow_runs (project_id, workflow_id, status)
     values (?, ?, ?) returning id`,
    [project.id, workflow.id, status],
  );

  return { projectId: project.id, workflowId: workflow.id, runId: run.id };
}

/** A valid job payload for the seeded run. */
export function jobFor({ runId, workflowId, projectId }, overrides = {}) {
  return { run_id: runId, workflow_id: workflowId, project_id: projectId, ...overrides };
}
