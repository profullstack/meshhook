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

import { db, json } from "./lib/db.js";
import { RUN_QUEUE, STEP_QUEUE, enqueueRun, enqueueStep } from "./lib/queue.js";
import { Worker } from "../src/queue/index.js";
import { executeStep } from "./http-exec.mjs";

/**
 * Rebuild a run's position from its event log.
 *
 * The engine is event-sourced: the events are the source of truth, so a
 * redelivered job recomputes the same answer rather than relying on any state
 * held in the worker.
 */
async function replay(runId) {
  const events = await db.manyOrNone(
    "select type, payload from workflow_events where run_id = ? order by id asc",
    [runId],
  );

  let current = null;
  let started = false;
  let terminated = false;

  for (const ev of events) {
    // payload is TEXT under SQLite, not a decoded jsonb value.
    const payload = json(ev.payload, {});

    if (ev.type === "step_succeeded") {
      started = true;
      current = payload.next ?? null;
      // A terminate node reports next: null, which is indistinguishable from
      // "not started yet" on its own — track it separately or the run restarts
      // from the first node forever.
      if (payload.node?.type === "terminate") terminated = true;
    }

    if (ev.type === "run_completed") terminated = true;
  }

  return { current, started, terminated };
}

/** The demo pipeline. Replaced by the workflow definition in issue #103. */
export async function nextNodesFor(runId) {
  const { current, started, terminated } = await replay(runId);

  if (terminated) return [];
  if (!started) return [{ id: "mapLead", type: "transform" }];
  if (current === "mapLead") return [{ id: "createContact", type: "http_call" }];
  if (current === "createContact") return [{ id: "terminate", type: "terminate" }];
  return [];
}

/** Advance one run: either finish it, or dispatch its next nodes. */
export async function handleRun(message) {
  const runId = message.run_id;

  if (!runId) {
    throw new Error("Run job is missing run_id");
  }

  // A job can be redelivered after its lease lapses, so completing a run has to
  // be idempotent — otherwise a second run_completed event is appended and the
  // finished_at timestamp is rewritten.
  const run = await db.oneOrNone("select status from workflow_runs where id = ?", [runId]);

  if (!run) {
    console.warn(`run ${runId} no longer exists; dropping job`);
    return;
  }

  if (run.status !== "running") {
    console.log(`run ${runId} is already ${run.status}; nothing to do`);
    return;
  }

  const nodes = await nextNodesFor(runId);

  if (nodes.length === 0) {
    await db.tx(async (t) => {
      await t.none(
        "insert into workflow_events (run_id, type, payload) values (?, 'run_completed', '{}')",
        [runId],
      );
      await t.none(
        `update workflow_runs
            set status = 'succeeded',
                finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          where id = ?`,
        [runId],
      );
    });
    console.log(`✓ run ${runId} completed`);
    return;
  }

  for (const node of nodes) {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values (?, 'step_started', ?)",
      [runId, JSON.stringify({ node })],
    );
    await enqueueStep(runId, node);
  }
}

/**
 * Execute one node, then ask the orchestrator to advance the run.
 *
 * Re-enqueueing the run is what closes the loop: the step writes its events,
 * and the next run job recomputes where the workflow goes from there.
 */
export async function handleStep(message) {
  const { run_id: runId, node } = message;

  if (!runId || !node) {
    throw new Error("Step job is missing run_id or node");
  }

  await executeStep(runId, node);
  await enqueueRun(runId);
}

/** Fail fast and legibly rather than crash-looping on the first query. */
function assertConfigured() {
  const url =
    process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.LIBSQL_URL;

  if (!url) {
    console.error(
      "✗ TURSO_DATABASE_URL is not set.\n" +
        "  Set it to a libsql:// URL (Turso) or a file: path for local runs.\n" +
        "  Create one with: turso db create meshhook && turso db show meshhook --url",
    );
    process.exit(1);
  }

  if (/^postgres(ql)?:\/\//i.test(url)) {
    console.error(
      "✗ TURSO_DATABASE_URL looks like a Postgres URL.\n" +
        "  MeshHook migrated from Supabase to Turso; expected libsql:// or file:.",
    );
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
    visibilityTimeoutSeconds: 120,
  });

  await runWorker.start();
  await stepWorker.start();

  console.log("🧠 MeshHook Orchestrator running");
  console.log(`   queues: ${RUN_QUEUE}, ${STEP_QUEUE}`);

  // Railway sends SIGTERM on redeploy; finish the in-flight job rather than
  // dropping its lease and waiting for the visibility timeout to expire.
  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    console.log(`\n${signal} received, stopping workers...`);

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
