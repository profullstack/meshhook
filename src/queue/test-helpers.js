/**
 * Test helpers for the queue and auth suites.
 *
 * Each test gets its own throwaway Postgres schema with the real migrations
 * applied, on the database TEST_DATABASE_URL points at. Without that variable
 * the suites that need a database skip (see `hasTestDb`), so the default test
 * run needs nothing but Node; CI passes TEST_DATABASE_URL when it has a
 * Postgres service to offer.
 *
 * A schema per test, rather than a database per test, keeps concurrently
 * running test files isolated from each other without needing CREATEDB: the
 * schema name travels in the connection URL as `options=-c search_path=...`,
 * so every pooled connection lands in it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createDb } from "@meshhook/shared/lib/db.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../../migrations-pg");

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** True when a Postgres is available for the suites that need one. */
export const hasTestDb = Boolean(TEST_DATABASE_URL);

/**
 * Create a fresh schema with the full Postgres schema applied.
 * @returns {Promise<object>} A db handle; close() also drops the schema.
 */
export async function createTestDb() {
  if (!hasTestDb) {
    throw new Error("createTestDb needs TEST_DATABASE_URL=postgres://... (the suite should be skipped without it)");
  }
  const schema = `test_${randomUUID().replace(/-/g, "")}`;
  const url = new URL(TEST_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  const db = createDb({ url: url.toString() });

  await db.pool.query(`create schema "${schema}"`);
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.pool.query(readFileSync(join(migrationsDir, file), "utf8"));
  }

  const close = db.close;
  db.close = async () => {
    await db.pool.query(`drop schema "${schema}" cascade`).catch(() => {});
    await close();
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
