/**
 * Orchestrator tests.
 *
 * These cover the run-advancing logic that was rewired when the in-process
 * EventEmitter was replaced by durable queues — in particular that a terminated
 * run stops instead of restarting from its first node, and that completing a
 * run is idempotent under redelivery.
 *
 * The orchestrator uses the shared db singleton, so DATABASE_URL is pointed at
 * a throwaway schema on TEST_DATABASE_URL before it is imported; without that
 * variable the suites skip. No network: the http_call branch is never
 * exercised here.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

let schema;
let db;
let getClient;
let orchestrator;
let stepQueue;
let runQueue;

beforeAll(async () => {
  if (!hasTestDb) return;
  schema = `test_${randomUUID().replace(/-/g, "")}`;
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();
  delete process.env.TURSO_DATABASE_URL;

  ({ db, getClient } = await import("@meshhook/shared/lib/db.js"));
  const pool = getClient().pool;
  await pool.query(`create schema "${schema}"`);
  for (const file of readdirSync(join(rootDir, "migrations-pg")).filter((f) => f.endsWith(".sql")).sort()) {
    await pool.query(readFileSync(join(rootDir, "migrations-pg", file), "utf8"));
  }

  orchestrator = await import("./orchestrator.mjs");
  ({ stepQueue, runQueue } = await import("./lib/queue.js"));
});

afterAll(async () => {
  if (!hasTestDb) return;
  await getClient().pool.query(`drop schema "${schema}" cascade`).catch(() => {});
  await db?.close();
});

/** A fresh project/workflow/run, plus helpers to drive its event log. */
async function seedRun() {
  const project = await db.one("insert into projects (owner, name) values (?, ?) returning id", [
    randomUUID(),
    "orch-test",
  ]);
  const workflow = await db.one(
    `insert into workflow_definitions (project_id, slug, name, definition)
     values (?, ?, ?, ?) returning id`,
    [project.id, `wf-${randomUUID()}`, "WF", JSON.stringify({ nodes: [] })],
  );
  const run = await db.one(
    `insert into workflow_runs (project_id, workflow_id, status)
     values (?, ?, 'running') returning id`,
    [project.id, workflow.id],
  );
  return run.id;
}

const succeed = (runId, node, next) =>
  db.none("insert into workflow_events (run_id, type, payload) values (?, 'step_succeeded', ?)", [
    runId,
    JSON.stringify({ node, next }),
  ]);

const statusOf = async (runId) =>
  (await db.one("select status from workflow_runs where id = ?", [runId])).status;

const eventTypes = async (runId) =>
  (await db.manyOrNone("select type from workflow_events where run_id = ? order by id", [runId])).map(
    (e) => e.type,
  );

describe.skipIf(!hasTestDb)("nextNodesFor", () => {
  let runId;
  beforeEach(async () => {
    runId = await seedRun();
  });

  it("starts a fresh run at the first node", async () => {
    expect(await orchestrator.nextNodesFor(runId)).toEqual([{ id: "mapLead", type: "transform" }]);
  });

  it("advances through the pipeline", async () => {
    await succeed(runId, { id: "mapLead", type: "transform" }, "mapLead");
    expect(await orchestrator.nextNodesFor(runId)).toEqual([
      { id: "createContact", type: "http_call" },
    ]);

    await succeed(runId, { id: "createContact", type: "http_call" }, "createContact");
    expect(await orchestrator.nextNodesFor(runId)).toEqual([{ id: "terminate", type: "terminate" }]);
  });

  it("stops after a terminate node rather than restarting", async () => {
    await succeed(runId, { id: "mapLead", type: "transform" }, "mapLead");
    await succeed(runId, { id: "createContact", type: "http_call" }, "createContact");
    // terminate reports next: null, which alone looks identical to "not started".
    await succeed(runId, { id: "terminate", type: "terminate" }, null);

    expect(await orchestrator.nextNodesFor(runId)).toEqual([]);
  });

  it("stops once a run_completed event exists", async () => {
    await db.none("insert into workflow_events (run_id, type, payload) values (?, 'run_completed', '{}')", [
      runId,
    ]);
    expect(await orchestrator.nextNodesFor(runId)).toEqual([]);
  });
});

describe.skipIf(!hasTestDb)("handleRun", () => {
  let runId;
  beforeEach(async () => {
    runId = await seedRun();
    await stepQueue.purge();
    await runQueue.purge();
  });

  it("records step_started and enqueues the step", async () => {
    await orchestrator.handleRun({ run_id: runId });

    expect(await eventTypes(runId)).toEqual(["step_started"]);

    const queued = await stepQueue.peek(10);
    expect(queued).toHaveLength(1);
    expect(queued[0].message).toMatchObject({ run_id: runId, node: { id: "mapLead" } });
  });

  it("completes a terminated run", async () => {
    await succeed(runId, { id: "terminate", type: "terminate" }, null);

    await orchestrator.handleRun({ run_id: runId });

    expect(await statusOf(runId)).toBe("succeeded");
    expect(await eventTypes(runId)).toContain("run_completed");
  });

  it("is idempotent when the job is redelivered", async () => {
    await succeed(runId, { id: "terminate", type: "terminate" }, null);

    await orchestrator.handleRun({ run_id: runId });
    await orchestrator.handleRun({ run_id: runId });

    // A second completion would append another run_completed and rewrite
    // finished_at.
    const completed = (await eventTypes(runId)).filter((t) => t === "run_completed");
    expect(completed).toHaveLength(1);
  });

  it("drops a job whose run no longer exists", async () => {
    await expect(orchestrator.handleRun({ run_id: randomUUID() })).resolves.toBeUndefined();
  });

  it("rejects a job with no run_id", async () => {
    await expect(orchestrator.handleRun({})).rejects.toThrow(/missing run_id/);
  });
});

describe.skipIf(!hasTestDb)("handleStep", () => {
  let runId;
  beforeEach(async () => {
    runId = await seedRun();
    await stepQueue.purge();
    await runQueue.purge();
  });

  it("executes a transform and re-enqueues the run", async () => {
    await orchestrator.handleStep({ run_id: runId, node: { id: "mapLead", type: "transform" } });

    expect(await eventTypes(runId)).toEqual(["step_succeeded"]);

    // Re-enqueueing the run is what closes the loop.
    const queued = await runQueue.peek(10);
    expect(queued).toHaveLength(1);
    expect(queued[0].message.run_id).toBe(runId);
  });

  it("rejects an unknown node type instead of reporting success", async () => {
    await expect(
      orchestrator.handleStep({ run_id: runId, node: { id: "x", type: "nope" } }),
    ).rejects.toThrow(/Unknown node type/);

    expect(await eventTypes(runId)).toEqual([]);
  });

  it("rejects a malformed job", async () => {
    await expect(orchestrator.handleStep({ run_id: runId })).rejects.toThrow(/missing run_id or node/);
  });
});
