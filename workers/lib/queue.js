/**
 * Worker queue bindings.
 *
 * This was an in-process EventEmitter. Two things were wrong with that once the
 * app moved off Supabase:
 *
 *  - Nothing crossed a process boundary. The web app enqueues a run when a
 *    webhook arrives, but a separately deployed orchestrator listens on its own
 *    EventEmitter and never hears it, so runs were silently dropped.
 *  - `bus.on(...)` does not hold the event loop open. `node orchestrator.mjs`
 *    registered a listener, printed its banner and exited immediately — which
 *    is why the Railway container kept reporting EXITED.
 *
 * Both queues are now durable rows in the database, so work survives a restart
 * and any number of worker processes can share it.
 */

import { Queue } from "@meshhook/shared/lib/queue.js";

/** Runs waiting for the orchestrator to decide their next step. */
export const RUN_QUEUE = "workflow_jobs";

/** Individual nodes waiting to be executed. */
export const STEP_QUEUE = "workflow_steps";

export const runQueue = new Queue({ name: RUN_QUEUE });
export const stepQueue = new Queue({ name: STEP_QUEUE });

/** Ask the orchestrator to advance a run. */
export async function enqueueRun(runId, delaySeconds = 0) {
  return runQueue.send({ run_id: runId }, delaySeconds);
}

/** Ask an executor to run a single node. */
export async function enqueueStep(runId, node, delaySeconds = 0) {
  return stepQueue.send({ run_id: runId, node }, delaySeconds);
}
