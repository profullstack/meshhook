/**
 * GET /api/runs - List runs across the caller's projects.
 *
 * The old query selected from a `runs` table joined to `workflows`; the run
 * table is workflow_runs. listRuns() joins the workflow for its name and slug
 * and scopes rows by project ownership.
 */

import { json } from '@sveltejs/kit';
import { listRuns } from '@meshhook/shared/lib/authz.js';

export async function GET(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const url = event.url;
	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 200);
	const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);
	const status = url.searchParams.get('status') ?? undefined;

	try {
		const runs = await listRuns(user.id, { limit, offset, status });
		return json({ runs });
	} catch (error) {
		console.error('Error fetching runs:', error);
		return json({ error: 'Failed to fetch runs' }, { status: 500 });
	}
}
