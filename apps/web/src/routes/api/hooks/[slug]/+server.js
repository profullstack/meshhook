/**
 * POST /api/hooks/[slug] — webhook ingest.
 *
 * Creates a run for the workflow and enqueues it for the orchestrator.
 *
 * Three fixes came with the Turso port:
 *  - `$2::jsonb` is not valid SQLite; the payload column is TEXT.
 *  - It imported `enqueueRun` from @meshhook/shared/lib/queue.js, which never
 *    exported that name — the in-process EventEmitter version lives in
 *    workers/lib/queue.js and only reaches workers inside the same process.
 *    The job now goes onto the real workflow_jobs queue, so a separately
 *    deployed orchestrator actually receives it.
 *  - The signature comparison used `!==`, which leaks the position of the first
 *    differing byte through timing. It is now constant-time.
 */

import crypto from 'node:crypto';
import { db } from '@meshhook/shared/lib/db.js';
import { Queue } from '@meshhook/shared/lib/queue.js';

/** Constant-time compare of two signature strings of possibly different length. */
function signaturesMatch(received, expected) {
	const a = Buffer.from(received);
	const b = Buffer.from(expected);
	// timingSafeEqual throws on a length mismatch, which would itself be a signal.
	if (a.length !== b.length) return false;
	return crypto.timingSafeEqual(a, b);
}

export async function POST({ request, params }) {
	const slug = params.slug;
	const bodyText = await request.text();
	const headers = Object.fromEntries(request.headers);

	const secret = process.env.DEFAULT_WEBHOOK_SECRET;
	const sig = headers['x-signature'] || headers['x-hub-signature-256'];

	if (secret && sig) {
		const digest = crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
		if (!signaturesMatch(sig, `sha256=${digest}`)) {
			return new Response('invalid signature', { status: 401 });
		}
	}

	const wf = await db.oneOrNone(
		`select id, project_id from workflow_definitions
		  where slug = ? order by version desc limit 1`,
		[slug]
	);

	if (!wf) return new Response('unknown workflow', { status: 404 });

	// The run row and its first event are written together: a run with no
	// run_created event would replay as an empty history.
	const run = await db.tx(async (t) => {
		const created = await t.one(
			`insert into workflow_runs (project_id, workflow_id, status)
			 values (?, ?, 'running') returning id`,
			[wf.project_id, wf.id]
		);

		await t.none(
			`insert into workflow_events (run_id, type, payload) values (?, 'run_created', ?)`,
			[created.id, JSON.stringify({ headers, body: bodyText })]
		);

		return created;
	});

	await new Queue({ name: 'workflow_jobs' }).send({
		run_id: run.id,
		workflow_id: wf.id,
		project_id: wf.project_id,
		attempt: 1
	});

	return new Response(null, { status: 202 });
}
