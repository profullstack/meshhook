/**
 * Load a single run with its workflow and event history.
 *
 * The old query selected from `runs` and `events` — neither table exists; the
 * names are workflow_runs and workflow_events. It also leaned on RLS for
 * tenancy, so an unauthorised id returned PGRST116 and was reported as 404.
 * getRun() scopes by owner and returns null for both cases, which keeps the
 * same 404 behaviour without disclosing that the run exists.
 */

import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth.js';
import { getRun, getWorkflow, listRunEvents } from '@meshhook/shared/lib/authz.js';
import { json as parseJson } from '@meshhook/shared/lib/db.js';

export async function load(event) {
	const user = requireAuth(event);
	const { id } = event.params;

	let run;
	let workflow;
	let events;

	try {
		run = await getRun(user.id, id);

		if (!run) {
			throw error(404, 'Run not found');
		}

		workflow = await getWorkflow(user.id, run.workflow_id);
		events = await listRunEvents(user.id, id, { limit: 1000 });
	} catch (err) {
		// A SvelteKit error carries a status; rethrow it untouched.
		if (err?.status) throw err;
		console.error('Error loading run:', err);
		throw error(500, 'Failed to load run');
	}

	return {
		run: {
			...run,
			workflow: workflow
				? { ...workflow, definition: parseJson(workflow.definition, {}) }
				: null,
			// payload is TEXT under SQLite, so decode it for the view.
			events: events.map((e) => ({ ...e, payload: parseJson(e.payload, {}) }))
		}
	};
}
