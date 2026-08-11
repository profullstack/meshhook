/**
 * GET/POST /api/workflows/[id]/versions — version history and rollback.
 *
 * The previous implementation queried a `workflow_versions` table with columns
 * like is_current and workflow_id. No migration ever created it, so both
 * handlers failed at runtime. Versioning in this schema is expressed inside
 * workflow_definitions: rows sharing (project_id, slug) with an increasing
 * `version`, which is the same model the publish path in ../+server.js uses.
 *
 * Rollback therefore means "copy an older version's definition into a new
 * highest version", which keeps history append-only.
 */

import { json } from '@sveltejs/kit';
import { db, json as parseJson } from '@meshhook/shared/lib/db.js';
import { getWorkflow } from '@meshhook/shared/lib/authz.js';

/**
 * GET /api/workflows/[id]/versions - Every version sharing this workflow's slug.
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

		const versions = await db.manyOrNone(
			`select id, project_id, slug, name, description, status, version,
			        definition, created_at, updated_at
			   from workflow_definitions
			  where project_id = ? and slug = ?
			  order by version desc`,
			[workflow.project_id, workflow.slug]
		);

		return json({
			versions: versions.map((v) => ({
				...v,
				definition: parseJson(v.definition, {}),
				is_current: v.id === workflow.id
			}))
		});
	} catch (error) {
		console.error('Error fetching versions:', error);
		return json({ error: 'Failed to fetch versions' }, { status: 500 });
	}
}

/**
 * POST /api/workflows/[id]/versions - Roll back to an earlier version.
 *
 * Body: { version_id: string, description?: string }
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

	const { version_id: versionId, description } = body;

	if (!versionId) {
		return json({ error: 'version_id is required' }, { status: 400 });
	}

	try {
		const workflow = await getWorkflow(user.id, event.params.id);

		if (!workflow) {
			return json({ error: 'Workflow not found' }, { status: 404 });
		}

		// Scope the source to this workflow's own history, so an id from another
		// workflow — or another tenant — cannot be copied in.
		const source = await db.oneOrNone(
			`select * from workflow_definitions
			  where id = ? and project_id = ? and slug = ?`,
			[versionId, workflow.project_id, workflow.slug]
		);

		if (!source) {
			return json({ error: 'Version not found for this workflow' }, { status: 404 });
		}

		const created = await db.tx(async (t) => {
			const { max_version: maxVersion } = await t.one(
				`select coalesce(max(version), 0) as max_version
				   from workflow_definitions where project_id = ? and slug = ?`,
				[workflow.project_id, workflow.slug]
			);

			return t.one(
				`insert into workflow_definitions
				   (project_id, slug, name, description, version, definition, status, user_id)
				 values (?, ?, ?, ?, ?, ?, 'draft', ?)
				 returning *`,
				[
					workflow.project_id,
					workflow.slug,
					source.name,
					description ?? `Rolled back to v${source.version}`,
					maxVersion + 1,
					source.definition,
					user.id
				]
			);
		});

		return json(
			{ version: { ...created, definition: parseJson(created.definition, {}) } },
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating version:', error);
		return json({ error: 'Failed to create version' }, { status: 500 });
	}
}
