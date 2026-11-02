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

/** A fresh project/workflow/run for a definition, with its webhook payload. */
async function seedRun(definition, payload = { headers: {}, body: "{}" }) {
  const project = await db.one("insert into projects (owner, name) values (?, ?) returning id", [
    randomUUID(),
    "orch-test",
  ]);
  const workflow = await db.one(
    `insert into workflow_definitions (project_id, slug, name, definition)
     values (?, ?, ?, ?) returning id`,
    [project.id, `wf-${randomUUID()}`, "WF", JSON.stringify(definition)],
  );
  const run = await db.one(
    `insert into workflow_runs (project_id, workflow_id, status)
     values (?, ?, 'running') returning id`,
    [project.id, workflow.id],
  );
  await db.none("insert into workflow_events (run_id, type, payload) values (?, 'run_created', ?)", [
    run.id,
    JSON.stringify(payload),
  ]);
  return run.id;
}

const n = (id, type, config = {}) => ({ id, type: "default", data: { type, label: id, config } });
const e = (source, target, sourceHandle) => ({ id: `${source}-${target}`, source, target, sourceHandle });

const statusOf = async (runId) =>
  (await db.one("select status from workflow_runs where id = ?", [runId])).status;

const events = async (runId) =>
  (await db.manyOrNone("select type, payload from workflow_events where run_id = ? order by id", [runId])).map(
    (r) => ({ type: r.type, ...JSON.parse(r.payload || "{}") }),
  );

/**
 * Drive a run to rest the way the two workers would: drain the run queue,
 * then the step queue, until both are empty. Delayed messages are left alone.
 */
async function drive(runId, execute, rounds = 50) {
  for (let i = 0; i < rounds; i++) {
    const [job] = await runQueue.read(30, 1);
    if (job) {
      await orchestrator.handleRun(job.message);
      await runQueue.deleteMessage(job.msg_id);
      continue;
    }
    const [step] = await stepQueue.read(30, 1);
    if (step) {
      await orchestrator.handleStep(step.message, execute ? { execute } : undefined);
      await stepQueue.deleteMessage(step.msg_id);
      continue;
    }
    return;
  }
  throw new Error("run did not settle");
}

const start = async (runId) => runQueue.send({ run_id: runId });

describe.skipIf(!hasTestDb)("engine end to end", () => {
  beforeEach(async () => {
    await stepQueue.purge();
    await runQueue.purge();
  });

  it("walks a webhook -> branch -> transform DAG and takes one side", async () => {
    const runId = await seedRun(
      {
        nodes: [
          n("hook", "webhook"),
          n("vip", "conditional", { condition: "body.vip" }),
          n("yes", "transform", { expression: "{tier: 'gold', name: body.name}" }),
          n("no", "transform", { expression: "{tier: 'basic'}" }),
          n("end", "terminate"),
        ],
        edges: [e("hook", "vip"), e("vip", "yes", "true"), e("vip", "no", "false"), e("yes", "end"), e("no", "end")],
      },
      { headers: {}, body: JSON.stringify({ vip: true, name: "Ada" }) },
    );
    await start(runId);
    await drive(runId);

    expect(await statusOf(runId)).toBe("succeeded");
    const log = await events(runId);
    const done = log.filter((x) => x.type === "step_succeeded").map((x) => x.node.id);
    expect(done).toEqual(["hook", "vip", "yes", "end"]);
    expect(log.find((x) => x.node?.id === "yes" && x.type === "step_succeeded").output).toEqual({ tier: "gold", name: "Ada" });
    expect(log.filter((x) => x.type === "run_completed")).toHaveLength(1);
    expect(log.every((x) => x.type !== "step_succeeded" || x.executed_on?.backend === "local")).toBe(true);
  });

  it("dispatches each node once even when the run job is redelivered", async () => {
    const runId = await seedRun({ nodes: [n("hook", "webhook")], edges: [] });
    await orchestrator.handleRun({ run_id: runId });
    await orchestrator.handleRun({ run_id: runId });
    expect((await events(runId)).filter((x) => x.type === "step_started")).toHaveLength(1);
    expect(await stepQueue.peek(10)).toHaveLength(1);
  });

  it("retries a retryable failure, then fails the run", async () => {
    const { NodeError } = await import("../src/engine/runners.js");
    const runId = await seedRun({
      nodes: [n("hook", "webhook"), n("call", "httpCall", { url: "https://x.test" })],
      edges: [e("hook", "call")],
      settings: { retryAttempts: 2, retryDelay: 250 },
    });
    let calls = 0;
    const execute = async (node, input) => {
      if (node.id !== "call") return { output: input };
      calls++;
      throw new NodeError("HTTP 503", { retryable: true });
    };
    await start(runId);
    await drive(runId, execute);
    // The retry was enqueued with a delay; make it visible and finish.
    await getClient().pool.query("update queue_messages set vt = '1970-01-01T00:00:00.000Z'");
    await drive(runId, execute);

    const fails = (await events(runId)).filter((x) => x.type === "step_failed");
    expect(fails.map((f) => [f.attempt, f.final])).toEqual([[1, false], [2, true]]);
    expect(calls).toBe(2);
    expect(await statusOf(runId)).toBe("failed");
  });

  it("fails fast on a non-retryable failure", async () => {
    const runId = await seedRun({ nodes: [n("hook", "webhook"), n("t", "transform", { expression: "[[" })], edges: [e("hook", "t")] });
    await start(runId);
    await drive(runId);
    expect(await statusOf(runId)).toBe("failed");
    const failed = (await events(runId)).find((x) => x.type === "run_failed");
    expect(failed.error).toMatch(/node t: transform failed/);
  });

  it("turns a delay into a durable scheduled redelivery", async () => {
    const runId = await seedRun({ nodes: [n("hook", "webhook"), n("wait", "delay", { duration: 60_000 })], edges: [e("hook", "wait")] });
    await start(runId);
    await drive(runId);
    const log = await events(runId);
    expect(log.some((x) => x.type === "delay_started")).toBe(true);
    expect(log.some((x) => x.type === "step_succeeded" && x.node.id === "wait")).toBe(false);
    expect(await statusOf(runId)).toBe("running");
  });

  it("fails a run whose definition does not parse", async () => {
    const runId = await seedRun({ nodes: [n("a", "transform"), n("b", "transform")], edges: [e("a", "b"), e("b", "a")] });
    await start(runId);
    await drive(runId);
    expect(await statusOf(runId)).toBe("failed");
  });

  it("drops jobs for missing runs and rejects malformed ones", async () => {
    await expect(orchestrator.handleRun({ run_id: randomUUID() })).resolves.toBeUndefined();
    await expect(orchestrator.handleRun({})).rejects.toThrow(/missing run_id/);
    await expect(orchestrator.handleStep({ run_id: randomUUID() })).rejects.toThrow(/missing run_id or node/);
  });
});
