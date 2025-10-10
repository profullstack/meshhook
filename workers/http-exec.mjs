import { setTimeout as delay } from "node:timers/promises";
import { db } from "./lib/db.js";
import { queue } from "./lib/queue.js";
import { request as undiciRequest } from "undici";

async function execHttp(runId, node) {
  const req = {
    method: "POST",
    url: "https://httpbin.org/post",
    headers: { "content-type": "application/json", "Idempotency-Key": `mh-${runId}-${node.id}` },
    body: JSON.stringify({ hello: "world", node: node.id })
  };

  let attempt = 0, max = 5, base = 500;
  while (attempt < max) {
    attempt++;
    try {
      const res = await undiciRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        bodyTimeout: 10_000,
        headersTimeout: 10_000
      });
      const text = await res.body.text();
      await db.none(
        "insert into workflow_events (run_id, type, payload) values ($1,'http_attempted',$2::jsonb)",
        [runId, JSON.stringify({ node, status: res.statusCode })]
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await db.none(
          "insert into workflow_events (run_id, type, payload) values ($1,'step_succeeded',$2::jsonb)",
          [runId, JSON.stringify({ node, next: node.id === 'createContact' ? 'terminate' : null, response: text.slice(0,2048) })]
        );
        return;
      }
      throw new Error(`HTTP ${res.statusCode}`);
    } catch (err) {
      const backoff = Math.min(8000, base * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await db.none(
        "insert into workflow_events (run_id, type, payload) values ($1,'step_failed',$2::jsonb)",
        [runId, JSON.stringify({ node, attempt, error: String(err) })]
      );
      if (attempt >= max) throw err;
      await delay(backoff);
    }
  }
}

async function handleStep(job) {
  const { run_id: runId, node } = job.data;
  if (node.type === "http_call") {
    await execHttp(runId, node);
  } else if (node.type === "transform") {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values ($1,'step_succeeded',$2::jsonb)",
      [runId, JSON.stringify({ node, next: "createContact", output: { ok: true } })]
    );
  } else if (node.type === "terminate") {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values ($1,'run_completed',$2::jsonb)",
      [runId, JSON.stringify({ reason: "terminated" })]
    );
    await db.none("update workflow_runs set status='succeeded', finished_at=now() where id=$1", [runId]);
  }
}

export async function startHttpExec() {
  await queue.process("step:execute", handleStep);
  console.log("🔧 MeshHook HTTP Executor running");
}

if (import.meta.url === `file://${process.argv[1]}`) startHttpExec();
