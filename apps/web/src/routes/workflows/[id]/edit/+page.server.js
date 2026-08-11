/**
 * Load a workflow for editing.
 *
 * The Supabase version joined projects to compare `project.owner` against the
 * user in JS. getWorkflow() puts that ownership test in the query, so a
 * workflow belonging to someone else is simply not returned.
 *
 * It also reports 404 rather than the old 403: answering "forbidden" confirms
 * the id exists, which is a small information leak on a guessable identifier.
 */

import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth.js';
import { getWorkflow } from '@meshhook/shared/lib/authz.js';
import { json as parseJson } from '@meshhook/shared/lib/db.js';

export async function load(event) {
	const user = requireAuth(event);
	const { id } = event.params;

	let workflow;
	try {
		workflow = await getWorkflow(user.id, id);
	} catch (err) {
		console.error('Error loading workflow:', err);
		throw error(500, 'Failed to load workflow');
	}

	if (!workflow) {
		throw error(404, 'Workflow not found');
	}

	return {
		// definition is TEXT under SQLite; the builder expects an object.
		workflow: { ...workflow, definition: parseJson(workflow.definition, { nodes: [], edges: [] }) },
		user
	};
}
