/**
 * GET/POST /api/secrets — list and create secrets.
 *
 * Two things changed beyond swapping out the Supabase client:
 *
 *  - The old code wrote `name`, `encrypted_value` and `description`, none of
 *    which exist on the secrets table (the columns are `key` and
 *    `value_encrypted`), so every insert failed. The field is now `key`, and
 *    `name` is still accepted on input for backwards compatibility.
 *  - It stored the raw value with a comment claiming a database trigger would
 *    encrypt it. No such trigger ever existed. Values are encrypted here, with
 *    AES-256-GCM, before they reach the database.
 *
 * Ciphertext is never returned by either handler.
 */

import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { encryptSecret, encryptionConfigured } from '@meshhook/shared/lib/crypto.js';
import { ownedProjectIdsSql, assertProjectAccess, ensureDefaultProject } from '@meshhook/shared/lib/authz.js';

/**
 * GET /api/secrets - List secrets across the user's projects.
 */
export async function GET(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	try {
		const secrets = await db.manyOrNone(
			`select s.id, s.key, s.project_id, s.created_at, s.updated_at, p.name as project_name
			   from secrets s
			   join projects p on p.id = s.project_id
			  where s.project_id in (${ownedProjectIdsSql()})
			  order by s.created_at desc`,
			[user.id]
		);

		return json({ secrets });
	} catch (error) {
		console.error('Error fetching secrets:', error);
		return json({ error: 'Failed to fetch secrets' }, { status: 500 });
	}
}

/**
 * POST /api/secrets - Create a secret.
 */
export async function POST(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (!encryptionConfigured()) {
		// Refuse rather than fall back to storing plaintext.
		return json(
			{ error: 'Secret storage is not configured (SECRETS_ENCRYPTION_KEY is unset)' },
			{ status: 503 }
		);
	}

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	// `name` is the legacy field name for what the schema calls `key`.
	const key = body.key ?? body.name;
	const { value, project_id: projectId } = body;

	if (!key || !value) {
		return json({ error: 'Key and value are required' }, { status: 400 });
	}

	try {
		const targetProject = projectId
			? await assertProjectAccess(user.id, projectId)
			: await ensureDefaultProject(user.id);

		const secret = await db.one(
			`insert into secrets (project_id, key, value_encrypted) values (?, ?, ?)
			 on conflict (project_id, key) do update set value_encrypted = excluded.value_encrypted
			 returning id, key, project_id, created_at, updated_at`,
			[targetProject, key, encryptSecret(String(value))]
		);

		return json({ secret }, { status: 201 });
	} catch (error) {
		if (error.status) {
			return json({ error: error.message }, { status: error.status });
		}
		console.error('Error creating secret:', error);
		return json({ error: 'Failed to create secret' }, { status: 500 });
	}
}
