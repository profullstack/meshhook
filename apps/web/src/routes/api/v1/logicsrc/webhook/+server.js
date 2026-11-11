/**
 * POST /api/v1/logicsrc/webhook — sealed keys from logicsrc (grant.delivered,
 * grant.updated after a rotation, grant.revoked). Signed per request; the
 * values are sealed to the owner's vault and stored as ordinary secrets.
 */
import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';
import { handleWebhook } from '@meshhook/shared/lib/logicsrc-grants.js';

export async function POST({ request }) {
	const raw = await request.text();
	const headers = Object.fromEntries(request.headers);
	const r = await handleWebhook(db, headers, raw);
	if (r.status === 200) console.log(`[logicsrc-grant] ${JSON.parse(raw).type} ${r.body.key ?? ''}`.trim());
	return json(r.body, { status: r.status });
}
