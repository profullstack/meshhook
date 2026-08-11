/**
 * GET/PUT/DELETE /api/workflows/[id]
 *
 * Ownership was previously established by fetching the caller's project ids and
 * comparing them in JS. That check is now part of each statement, via the
 * `project_id in (owned projects)` predicate — with RLS gone it is the only
 * thing standing between a guessed id and another tenant's workflow.
 *
 * Publishing creates a new version row and archives the draft. Those were two
 * independent requests before, so a failure between them left the workflow both
 * published and un-archived; they now share a transaction.
 */

import { json } from '@sveltejs/kit';
import { db, json as parseJson } from '@meshhook/shared/lib/db.js';
import { getWorkflow, ownedProjectIdsSql } from '@meshhook/shared/lib/authz.js';

/** Decode the stored JSON definition for the response. */
const present = (workflow) => ({ ...workflow, definition: parseJson(workflow.definition, {}) });

/**
 * GET /api/workflows/[id]
 */
export async function GET(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const workflow = await getWorkflow(user.id, event.params.id);

		if (!workflow) {
			return json({ error: 'Workflow not found' }, { status: 404 });
		}

		return json({ workflow: present(workflow) });
	} catch (error) {
		console.error('Error fetching workflow:', error);
		return json({ error: 'Failed to fetch workflow' }, { status: 500 });
	}
}

/**
 * PUT /api/workflows/[id] - Update, or publish as a new version.
 */
export async function PUT(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { name, description, nodes, edges, status } = body;

	try {
		const current = await getWorkflow(user.id, id);

		if (!current) {
			return json({ error: 'Workflow not found' }, { status: 404 });
		}

		const definition =
			nodes !== undefined || edges !== undefined
				? JSON.stringify({ nodes, edges })
				: current.definition;

		const isPublishing = status === 'published' && current.status === 'draft';

		if (isPublishing) {
			const workflow = await db.tx(async (t) => {
				const { max_version: maxVersion } = await t.one(
					`select coalesce(max(version), 0) as max_version
					   from workflow_definitions where project_id = ? and slug = ?`,
					[current.project_id, current.slug]
				);

				const created = await t.one(
					`insert into workflow_definitions
					   (project_id, slug, name, description, version, definition, status, user_id)
					 values (?, ?, ?, ?, ?, ?, 'published', ?)
					 returning *`,
					[
						current.project_id,
						current.slug,
						name ?? current.name,
						description ?? current.description,
						maxVersion + 1,
						definition,
						current.user_id
					]
				);

				await t.none(`update workflow_definitions set status = 'archived' where id = ?`, [id]);

				return created;
			});

			return json({ workflow: present(workflow) });
		}

		// In-place edit. Only the fields actually supplied are touched; the
		// column list is fixed, so this cannot be turned into arbitrary SQL.
		const updates = [];
		const params = [];

		if (name !== undefined) {
			updates.push('name = ?');
			params.push(name);
		}
		if (description !== undefined) {
			updates.push('description = ?');
			params.push(description);
		}
		if (nodes !== undefined || edges !== undefined) {
			updates.push('definition = ?');
			params.push(definition);
		}
		if (status !== undefined) {
			updates.push('status = ?');
			params.push(status);
		}

		if (updates.length === 0) {
			return json({ workflow: present(current) });
		}

		params.push(id, user.id);

		const workflow = await db.oneOrNone(
			`update workflow_definitions set ${updates.join(', ')}
			  where id = ? and project_id in (${ownedProjectIdsSql()})
			 returning *`,
			params
		);

		if (!workflow) {
			return json({ error: 'Workflow not found' }, { status: 404 });
		}

		return json({ workflow: present(workflow) });
	} catch (error) {
		console.error('Error updating workflow:', error);
		return json({ error: 'Failed to update workflow' }, { status: 500 });
	}
}

/**
 * DELETE /api/workflows/[id]
 */
export async function DELETE(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { rowsAffected } = await db.none(
			`delete from workflow_definitions
			  where id = ? and project_id in (${ownedProjectIdsSql()})`,
			[event.params.id, user.id]
		);

		if (rowsAffected === 0) {
			return json({ error: 'Workflow not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting workflow:', error);
		return json({ error: 'Failed to delete workflow' }, { status: 500 });
	}
}
