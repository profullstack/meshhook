/**
 * MeshHook orchestrator.
 *
 * Long-running process that drains two durable queues:
 *
 *   workflow_jobs   a run needs its next step decided
 *   workflow_steps  a node needs executing
 *
 * It previously registered two EventEmitter listeners and returned. That did
 * not keep the event loop alive, so the process printed its banner and exited —
 * Railway reported the container as EXITED on every deploy. It also meant runs
 * enqueued by the web app (a different process) were never seen at all.
 *
 * Both worker loops poll the database, which holds the process open for as long
 * as it is running and lets several instances share the work safely.
 */

import { db, json, resolveConnection } from "./lib/db.js";
import { RUN_QUEUE, STEP_QUEUE, enqueueRun, enqueueStep } from "./lib/queue.js";
import { Worker } from "../src/queue/index.js";
import { startOperatorControl } from "@meshhook/shared/lib/operator-keys.js";
import { buildGraph, configOf, kindOf } from "../src/engine/graph.js";
import { decide, inputFor, nodeOutputs, replay } from "../src/engine/scheduler.js";
import { NodeError, triggerOutput } from "../src/engine/runners.js";
import { executeNode } from "../src/engine/c0mpute.js";

const now = () => new Date().toISOString();
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

const appendEvent = (q, runId, type, payload) =>
  q.none("insert into workflow_events (run_id, type, payload) values (?, ?, ?)", [
    runId,
    type,
    JSON.stringify(payload ?? {}),
  ]);

/** The run, its definition and its event log, in one place. */
async function loadRun(q, runId, { lock = false } = {}) {
  const run = await q.oneOrNone(
    `select r.id, r.status, r.workflow_id, d.definition
       from workflow_runs r
       join workflow_definitions d on d.id = r.workflow_id
      where r.id = ?${lock ? " for update of r" : ""}`,
    [runId],
  );
  if (!run) return null;
  const events = await q.manyOrNone(
    "select type, payload from workflow_events where run_id = ? order by id asc",
    [runId],
  );
  let graph;
  try {
    graph = buildGraph(json(run.definition, {}) ?? {});
  } catch (error) {
    graph = { error: error.message };
  }
  return { run, events, graph, state: replay(events) };
}

/**
 * Advance one run: dispatch every node whose inputs are ready, or finish it.
 *
 * Runs under a row lock on workflow_runs, so two orchestrators handling the
 * same run (every finished step enqueues one) never dispatch a node twice.
 */
export async function handleRun(message) {
  const runId = message.run_id;
  if (!runId) throw new Error("Run job is missing run_id");

  const toEnqueue = [];
  const outcome = await db.tx(async (t) => {
    const loaded = await loadRun(t, runId, { lock: true });
    if (!loaded) return `run ${runId} no longer exists; dropping job`;
    const { run, graph, state } = loaded;
    if (run.status !== "running") return `run ${runId} is already ${run.status}; nothing to do`;

    const decision = graph.error ? { action: "fail", error: `definition: ${graph.error}` } : decide(graph, state);

    if (decision.action === "complete" || decision.action === "fail") {
      const ok = decision.action === "complete";
      await appendEvent(t, runId, ok ? "run_completed" : "run_failed", ok ? {} : { error: decision.error });
      await t.none(
        `update workflow_runs set status = ?, finished_at = ${NOW_SQL}, updated_at = ${NOW_SQL} where id = ?`,
        [ok ? "succeeded" : "failed", runId],
      );
      return ok ? `✓ run ${runId} completed` : `✗ run ${runId} failed: ${decision.error}`;
    }

    if (decision.action === "dispatch") {
      for (const node of decision.nodes) {
        const ref = { id: node.id, kind: kindOf(node) };
        await appendEvent(t, runId, "step_started", { node: ref });
        toEnqueue.push(ref);
      }
      return `run ${runId}: dispatched ${toEnqueue.map((n) => n.id).join(", ")}`;
    }
    return null;
  });

  // Enqueue after commit: a step must never see a run whose step_started is
  // not yet visible.
  for (const ref of toEnqueue) await enqueueStep(runId, ref);
  if (outcome) console.log(outcome);
}

/** Retry budget and backoff from the workflow's settings panel. */
function retryPolicy(settings = {}) {
  const max = Math.max(1, Math.min(Number(settings.retryAttempts ?? 3) || 3, 10));
  const baseMs = Math.max(250, Number(settings.retryDelay ?? 1000) || 1000);
  return { max, delaySeconds: (attempt) => Math.min(300, Math.ceil((baseMs * 2 ** (attempt - 1)) / 1000)) };
}

/**
 * Execute one node, record the result, and ask the orchestrator to advance.
 *
 * Node failures are handled here, not by the queue worker: a retryable failure
 * re-enqueues the step with backoff, a final one is written as step_failed
 * {final: true} and the next run job fails the run. Only infrastructure errors
 * (the database) propagate to the worker's own retry/DLQ.
 */
export async function handleStep(message, { execute = executeNode } = {}) {
  const { run_id: runId, node: ref } = message;
  const attempt = Number(message.step_attempt ?? 1);
  if (!runId || !ref?.id) throw new Error("Step job is missing run_id or node");

  const loaded = await loadRun(db, runId);
  if (!loaded || loaded.run.status !== "running") return;
  const { graph, state, events } = loaded;

  // Redelivered after it already finished: just make sure the run advances.
  if (state.succeeded.has(ref.id) || state.failed.has(ref.id)) {
    await enqueueRun(runId);
    return;
  }

  const node = graph.byId?.get(ref.id);
  if (!node) {
    await appendEvent(db, runId, "step_failed", { node: ref, attempt, final: true, error: "node is not in the workflow definition" });
    await enqueueRun(runId);
    return;
  }
  const kind = kindOf(node);
  const config = configOf(node);

  if (kind === "delay") {
    const ms = Math.max(0, Number(config.duration) || 0);
    const started = events.find((e) => e.type === "delay_started" && json(e.payload, {})?.node?.id === ref.id);
    const until = started ? Date.parse(json(started.payload, {}).until) : Date.now() + ms;
    if (!started) await appendEvent(db, runId, "delay_started", { node: ref, until: new Date(until).toISOString() });
    const remaining = until - Date.now();
    if (remaining > 0) {
      // A durable wait: the step comes back when the delay is over, even
      // across restarts, instead of a sleep holding a worker.
      await enqueueStep(runId, ref, Math.ceil(remaining / 1000), attempt);
      return;
    }
  }

  const trigger = triggerOutput(state.trigger);
  const ins = graph.incoming.get(ref.id) ?? [];
  const input = ins.length === 0 ? trigger : inputFor(graph, state, node);
  const ctx = { trigger, nodes: nodeOutputs(graph, state), loopBody: graph.loopBody };

  try {
    const result = await execute(node, input, ctx, { settings: graph.settings });
    await appendEvent(db, runId, "step_succeeded", {
      node: ref,
      output: result.output ?? null,
      ...(result.branch !== undefined ? { branch: result.branch } : {}),
      executed_on: result.executed_on ?? { backend: "local" },
      attempt,
      finished_at: now(),
    });
    if (kind === "terminate") await appendEvent(db, runId, "run_terminated", { node: ref });
  } catch (error) {
    if (!(error instanceof NodeError)) throw error; // infrastructure: let the worker retry
    const policy = retryPolicy(graph.settings);
    const max = Math.max(policy.max, error.minAttempts ?? 0);
    const delaySeconds = (n) => Math.max(policy.delaySeconds(n), (error.retryAfter ?? 0) * 2 ** (n - 1));
    const final = !error.retryable || attempt >= max;
    await appendEvent(db, runId, "step_failed", {
      node: ref,
      attempt,
      final,
      error: error.message,
      ...(error.status ? { status: error.status } : {}),
      ...(error.executed_on ? { executed_on: error.executed_on } : {}),
    });
    if (!final) {
      await enqueueStep(runId, ref, delaySeconds(attempt), attempt + 1);
      return;
    }
  }

  await enqueueRun(runId);
}

/** Fail fast and legibly rather than crash-looping on the first query. */
function assertConfigured() {
  // resolveConnection throws with the reason: unset, not postgres://, or a
  // leftover TURSO_DATABASE_URL with the copy recipe.
  try {
    resolveConnection();
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
}

export async function startOrchestrator() {
  assertConfigured();

  // Surface a bad URL or token now, rather than on the first job.
  try {
    await db.one("select 1 as ok");
  } catch (error) {
    console.error(`✗ Cannot reach the database: ${error.message}`);
    process.exit(1);
  }

  const runWorker = new Worker({
    queueName: RUN_QUEUE,
    jobHandler: handleRun,
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 1000),
  });

  const stepWorker = new Worker({
    queueName: STEP_QUEUE,
    jobHandler: handleStep,
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 1000),
    // Longer than the slowest step (an AI step may stream for 5 minutes, a
    // c0mpute step adds an auction), or a live step is redelivered and runs twice.
    visibilityTimeoutSeconds: Number(process.env.STEP_VISIBILITY_SECONDS ?? 900),
  });

  await runWorker.start();
  await stepWorker.start();

  // Operator unlock channel (loopback only): the x402 payer key opens only
  // after `scripts/operator-vault.mjs unlock`; a restart re-locks it.
  const control = startOperatorControl({ db });

  console.log("🧠 MeshHook Orchestrator running");
  console.log(`   queues: ${RUN_QUEUE}, ${STEP_QUEUE}`);

  // Railway sends SIGTERM on redeploy; finish the in-flight job rather than
  // dropping its lease and waiting for the visibility timeout to expire.
  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`\n${signal} received, stopping workers...`);

    control?.stop(true);
    await Promise.allSettled([runWorker.stop(), stepWorker.stop()]);
    await db.close();

    console.log("Orchestrator stopped");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return { runWorker, stepWorker };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startOrchestrator().catch((error) => {
    console.error(`✗ Orchestrator failed to start: ${error.message}`);
    process.exit(1);
  });
}
