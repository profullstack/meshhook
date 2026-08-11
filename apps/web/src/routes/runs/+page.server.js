/**
 * Load runs for the list view.
 *
 * The Supabase version relied on RLS to limit rows to the caller's projects;
 * listRuns() applies that scoping in the query instead.
 */

import { requireAuth } from '$lib/auth.js';
import { listRuns } from '@meshhook/shared/lib/authz.js';

export async function load(event) {
	const user = requireAuth(event);

	try {
		const runs = await listRuns(user.id, { limit: 100 });
		return { runs, user };
	} catch (error) {
		console.error('Error loading runs:', error);
		return { runs: [], user, error: 'Failed to load runs' };
	}
}
