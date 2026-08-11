/**
 * PUT/DELETE /api/secrets/[id]
 *
 * Both handlers now scope the statement to the caller's projects. Under RLS the
 * database rejected a cross-tenant `delete ... where id = ?`; without RLS that
 * same statement would happily delete another tenant's secret, so the ownership
 * predicate is part of the query itself rather than a separate check.
 */

import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { encryptSecret, encryptionConfigured } from '@meshhook/shared/lib/crypto.js';
import { ownedProjectIdsSql } from '@meshhook/shared/lib/authz.js';

/**
 * PUT /api/secrets/[id] - Replace a secret's value.
 */
export async function PUT(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	if (!encryptionConfigured()) {
		return json(
			{ error: 'Secret storage is not configured (SECRETS_ENCRYPTION_KEY is unset)' },
			{ status: 503 }
		);
	}

	const { id } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { value } = body;

	if (value === undefined) {
		return json({ error: 'Value is required' }, { status: 400 });
	}

	try {
		const secret = await db.oneOrNone(
			`update secrets set value_encrypted = ?
			  where id = ? and project_id in (${ownedProjectIdsSql()})
			 returning id, key, project_id, created_at, updated_at`,
			[encryptSecret(String(value)), id, user.id]
		);

		if (!secret) {
			return json({ error: 'Secret not found' }, { status: 404 });
		}

		return json({ secret });
	} catch (error) {
		console.error('Error updating secret:', error);
		return json({ error: 'Failed to update secret' }, { status: 500 });
	}
}

/**
 * DELETE /api/secrets/[id]
 */
export async function DELETE(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const { id } = event.params;

	try {
		const { rowsAffected } = await db.none(
			`delete from secrets where id = ? and project_id in (${ownedProjectIdsSql()})`,
			[id, user.id]
		);

		// Report 404 rather than a silent success so a caller can tell the
		// difference between "deleted" and "was never yours".
		if (rowsAffected === 0) {
			return json({ error: 'Secret not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting secret:', error);
		return json({ error: 'Failed to delete secret' }, { status: 500 });
	}
}
