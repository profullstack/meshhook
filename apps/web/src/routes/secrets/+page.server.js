/**
 * Load the secrets vault.
 *
 * Ciphertext is deliberately not selected — the list view only needs the key
 * names, and the encrypted value has no business being sent to the browser.
 */

import { requireAuth } from '$lib/auth.js';
import { db } from '@meshhook/shared/lib/db.js';
import { listProjects, ownedProjectIdsSql } from '@meshhook/shared/lib/authz.js';

export async function load(event) {
	const user = requireAuth(event);

	try {
		const [secrets, projects] = await Promise.all([
			db.manyOrNone(
				`select s.id, s.key, s.project_id, s.created_at, s.updated_at,
				        p.name as project_name
				   from secrets s
				   join projects p on p.id = s.project_id
				  where s.project_id in (${ownedProjectIdsSql()})
				  order by s.created_at desc`,
				[user.id]
			),
			listProjects(user.id)
		]);

		return { secrets, projects, user };
	} catch (error) {
		console.error('Error in secrets load:', error);
		return { secrets: [], projects: [], user, error: 'Failed to load secrets' };
	}
}
