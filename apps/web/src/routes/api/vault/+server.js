/**
 * GET/POST /api/vault — the caller's key vault record.
 *
 * The vault is made in the browser from a passphrase (see the Secrets page);
 * only the sealed record comes here. GET returns it so the browser can unlock
 * locally (e.g. to reveal a secret). Nothing here can open a secret.
 */

import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { createVault, getVault } from '@meshhook/shared/lib/vault.js';

export async function GET(event) {
	const user = event.locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	const vault = await getVault(db, user.id);
	return json({ exists: Boolean(vault), seal: vault?.seal ?? null });
}

export async function POST(event) {
	const user = event.locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await event.request.json().catch(() => ({}));
	try {
		await createVault(db, user.id, body?.seal);
		return json({ ok: true }, { status: 201 });
	} catch (e) {
		return json({ error: e.message }, { status: e.status ?? 500 });
	}
}
