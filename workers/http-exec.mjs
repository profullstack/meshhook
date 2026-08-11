import { setTimeout as delay } from "node:timers/promises";
import { db } from "./lib/db.js";
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
        "insert into workflow_events (run_id, type, payload) values ($1,'http_attempted',$2)",
        [runId, JSON.stringify({ node, status: res.statusCode })]
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await db.none(
          "insert into workflow_events (run_id, type, payload) values ($1,'step_succeeded',$2)",
          [runId, JSON.stringify({ node, next: node.id === 'createContact' ? 'terminate' : null, response: text.slice(0,2048) })]
        );
        return;
      }
      throw new Error(`HTTP ${res.statusCode}`);
    } catch (err) {
      const backoff = Math.min(8000, base * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await db.none(
        "insert into workflow_events (run_id, type, payload) values ($1,'step_failed',$2)",
        [runId, JSON.stringify({ node, attempt, error: String(err) })]
      );
      if (attempt >= max) throw err;
      await delay(backoff);
    }
  }
}

/**
 * Execute one workflow node.
 *
 * This used to subscribe to an in-process EventEmitter. The orchestrator now
 * owns the polling loop and calls this directly, so execution is driven by the
 * durable workflow_steps queue instead — a step survives a restart, and a
 * failure propagates to the worker, which retries or dead-letters it rather
 * than logging into the void.
 *
 * @param {string} runId
 * @param {{id: string, type: string}} node
 */
export async function executeStep(runId, node) {
  if (node.type === "http_call") {
    await execHttp(runId, node);
    return;
  }

  if (node.type === "transform") {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values (?, 'step_succeeded', ?)",
      [runId, JSON.stringify({ node, next: "createContact", output: { ok: true } })]
    );
    return;
  }

  if (node.type === "terminate") {
    await db.none(
      "insert into workflow_events (run_id, type, payload) values (?, 'step_succeeded', ?)",
      [runId, JSON.stringify({ node, next: null, reason: "terminated" })]
    );
    return;
  }

  // An unknown node type must not look like success: leaving the run to be
  // marked completed would hide a definition the engine cannot execute.
  throw new Error(`Unknown node type "${node.type}" for node ${node.id}`);
}
