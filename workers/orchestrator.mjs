import { db } from "@meshhook/shared/lib/db.js";
import { queue, enqueueStep } from "@meshhook/shared/lib/queue.js";

async function replay(runId) {
  const events = await db.manyOrNone(
    "select type, payload from workflow_events where run_id=$1 order by ts asc",
    [runId]
  );
  let ctx = { current: null };
  for (const ev of events) {
    if (ev.type === "step_succeeded") ctx.current = ev.payload.next ?? null;
  }
  return ctx;
}

async function nextNodesFor(runId) {
  const ctx = await replay(runId);
  if (!ctx.current) return [{ id: "mapLead", type: "transform" }];
  if (ctx.current === "mapLead") return [{ id: "createContact", type: "http_call" }];
  if (ctx.current === "createContact") return [{ id: "terminate", type: "terminate" }];
  return [];
}

async function handleRun(job) {
  const { run_id: runId } = job.data;
  const nodes = await nextNodesFor(runId);
  if (nodes.length === 0) {
    await db.tx(async t => {
      await t.none(
        "insert into workflow_events (run_id, type, payload) values ($1,'run_completed','{}')",
        [runId]
      );
      await t.none("update workflow_runs set status='succeeded', finished_at=now() where id=$1", [runId]);
    });
    return;
  }
  for (const node of nodes) {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values ($1,'step_started',$2::jsonb)",
      [runId, JSON.stringify({ node })]
    );
    await enqueueStep(runId, node);
  }
}

export async function startOrchestrator() {
  await queue.process("run:orchestrate", handleRun);
  console.log("🧠 MeshHook Orchestrator running");
}

if (import.meta.url === `file://${process.argv[1]}`) startOrchestrator();
