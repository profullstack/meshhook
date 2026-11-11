/**
 * Webhook ingest shared by /api/hooks/[slug] (legacy) and
 * /api/hooks/[project]/[slug].
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

/**
 * Ingest one webhook call for a workflow lineage. `projectId` null means the
 * legacy /api/hooks/<slug> URL, which is only honoured while the slug is
 * unique across projects (it used to pick whichever project's row sorted
 * first, i.e. a stranger's workflow could receive your payload).
 */
export async function ingestHook(request, { slug, projectId = null }) {
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

	if (!projectId) {
		const owners = await db.manyOrNone(`select distinct project_id from workflow_definitions where slug = ?`, [slug]);
		if (owners.length > 1) {
			return new Response(
				'ambiguous workflow slug: use the URL shown on the workflow\'s Webhook node (/api/hooks/<project>/<slug>)',
				{ status: 409 }
			);
		}
		projectId = owners[0]?.project_id ?? null;
	}
	if (!projectId) return new Response('unknown workflow', { status: 404 });

	// The published version runs; a workflow never published runs its latest draft,
	// so a webhook can be tested before publishing. Archived versions never run.
	const wf = await db.oneOrNone(
		`select id, project_id from workflow_definitions
		  where project_id = ? and slug = ? and status in ('published', 'draft')
		  order by (status = 'published') desc, version desc limit 1`,
		[projectId, slug]
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
			[created.id, JSON.stringify({ headers, query: Object.fromEntries(new URL(request.url).searchParams), body: bodyText })]
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
