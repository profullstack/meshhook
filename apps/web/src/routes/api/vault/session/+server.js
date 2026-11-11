/**
 * /api/vault/session — let unattended workflow runs use the caller's secrets.
 *
 * POST { data_key, ttl? }  the browser derived the vault data key from the
 *                          passphrase; we hand it to the orchestrator's
 *                          loopback control server, which verifies it and
 *                          keeps it in memory for the TTL. Never stored.
 * GET                      { unlocked, expiresAt }
 * DELETE                   lock now
 *
 * Only ever for event.locals.user: a caller cannot unlock someone else.
 */

import { json } from '@sveltejs/kit';
import { CONTROL_PORT, readControlToken } from '@meshhook/shared/lib/operator-keys.js';

async function control(path, init = {}) {
	const token = readControlToken();
	if (!token) return json({ error: 'The run unlock channel is not available on this server.' }, { status: 503 });
	let res;
	try {
		res = await fetch(`http://127.0.0.1:${CONTROL_PORT}${path}`, {
			...init,
			headers: { 'content-type': 'application/json', 'x-operator-control-token': token },
			signal: AbortSignal.timeout(10_000)
		});
	} catch {
		return json({ error: 'The workflow runner is restarting; try again in a moment.' }, { status: 503 });
	}
	return json(await res.json().catch(() => ({})), { status: res.status });
}

export async function GET({ locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	return control(`/user-status?user_id=${encodeURIComponent(locals.user.id)}`);
}

export async function POST({ locals, request }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => ({}));
	if (typeof body.data_key !== 'string' || !body.data_key) return json({ error: 'data_key required' }, { status: 400 });
	return control('/user-unlock', {
		method: 'POST',
		body: JSON.stringify({ user_id: locals.user.id, data_key: body.data_key, ttl: body.ttl })
	});
}

export async function DELETE({ locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	return control('/user-lock', { method: 'POST', body: JSON.stringify({ user_id: locals.user.id }) });
}
