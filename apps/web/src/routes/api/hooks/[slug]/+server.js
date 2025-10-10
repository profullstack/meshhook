import crypto from "node:crypto";

export async function POST({ request, params }) {
  const slug = params.slug;
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  const secret = process.env.DEFAULT_WEBHOOK_SECRET;
  const sig = headers["x-signature"] || headers["x-hub-signature-256"];
  if (secret && sig) {
    const h = crypto.createHmac("sha256", secret).update(bodyText).digest("hex");
    const expected = `sha256=${h}`;
    if (sig !== expected) {
      return new Response("invalid signature", { status: 401 });
    }
  }

  const { db } = await import("../../../../../workers/lib/db.js");
  const { enqueueRun } = await import("../../../../../workers/lib/queue.js");

  const wf = await db.oneOrNone(
    `select id, project_id from workflow_definitions
     where slug=$1 order by version desc limit 1`,
    [slug]
  );
  if (!wf) return new Response("unknown workflow", { status: 404 });

  const run = await db.one(
    `insert into workflow_runs (project_id, workflow_id, status)
     values ($1,$2,'running') returning id`,
    [wf.project_id, wf.id]
  );
  await db.none(
    `insert into workflow_events (run_id, type, payload)
     values ($1, 'run_created', $2::jsonb)`,
    [run.id, JSON.stringify({ headers, body: bodyText })]
  );

  await enqueueRun(run.id);
  return new Response(null, { status: 202 });
}
