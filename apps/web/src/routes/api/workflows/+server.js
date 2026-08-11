/**
 * GET/POST /api/workflows
 *
 * Writes go to workflow_definitions rather than the `workflows` view: under
 * Postgres the view accepted inserts via rules, but the SQLite view is a plain
 * projection and is read-only.
 *
 * The default-project bootstrap that was inlined here is now
 * ensureDefaultProject() in authz.js, shared with the signup flow.
 */

import { json } from '@sveltejs/kit';
import { db, json as parseJson } from '@meshhook/shared/lib/db.js';
import { listWorkflows, ensureDefaultProject, assertProjectAccess } from '@meshhook/shared/lib/authz.js';

/** "My Workflow!" -> "my-workflow" */
function slugify(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * GET /api/workflows - List the caller's workflows.
 */
export async function GET(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const workflows = await listWorkflows(user.id, { limit: 200 });
		return json({
			workflows: workflows.map((w) => ({ ...w, definition: parseJson(w.definition, {}) }))
		});
	} catch (error) {
		console.error('Error fetching workflows:', error);
		return json({ error: 'Failed to fetch workflows' }, { status: 500 });
	}
}

/**
 * POST /api/workflows - Create a workflow.
 */
export async function POST(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { name, description, nodes = [], edges = [], status = 'draft', project_id: projectId } = body;

	if (!name) {
		return json({ error: 'Workflow name is required' }, { status: 400 });
	}

	const slug = slugify(name);

	if (!slug) {
		return json({ error: 'Workflow name must contain letters or digits' }, { status: 400 });
	}

	try {
		const targetProject = projectId
			? await assertProjectAccess(user.id, projectId)
			: await ensureDefaultProject(user.id, 'Default Project');

		const workflow = await db.one(
			`insert into workflow_definitions
			   (project_id, slug, name, description, definition, status, user_id, version)
			 values (?, ?, ?, ?, ?, ?, ?, 1)
			 returning *`,
			[
				targetProject,
				slug,
				name,
				description ?? null,
				JSON.stringify({ nodes, edges }),
				status,
				user.id
			]
		);

		return json(
			{ workflow: { ...workflow, definition: parseJson(workflow.definition, {}) } },
			{ status: 201 }
		);
	} catch (error) {
		if (error.status) {
			return json({ error: error.message }, { status: error.status });
		}
		// unique(project_id, slug, version) — a second workflow with the same name.
		if (/UNIQUE constraint failed/i.test(error.message)) {
			return json(
				{ error: `A workflow named "${name}" already exists in this project` },
				{ status: 409 }
			);
		}
		console.error('Error creating workflow:', error);
		return json({ error: 'Failed to create workflow' }, { status: 500 });
	}
}
