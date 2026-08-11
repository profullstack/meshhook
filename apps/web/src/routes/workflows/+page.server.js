/**
 * Load workflows for the list view.
 *
 * The Supabase version fetched the user's project ids, then queried workflows
 * with an `in` filter, relying on RLS as a second layer. listWorkflows() does
 * both in one statement — there is no second layer any more, so the scoping
 * predicate has to be part of the query.
 */

import { requireAuth } from '$lib/auth.js';
import { listWorkflows } from '@meshhook/shared/lib/authz.js';
import { json as parseJson } from '@meshhook/shared/lib/db.js';

export async function load(event) {
	const user = requireAuth(event);

	try {
		const workflows = await listWorkflows(user.id, { limit: 200 });

		return {
			workflows: workflows.map((w) => ({ ...w, definition: parseJson(w.definition, {}) })),
			user
		};
	} catch (error) {
		console.error('Error loading workflows:', error);
		return { workflows: [], user, error: 'Failed to load workflows' };
	}
}
