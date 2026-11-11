/**
 * POST /api/v1/logicsrc/webhook — sealed keys from logicsrc: grant.delivered,
 * grant.updated after a rotation, grant.revoked. Signed per request
 * (@profullstack/key-grants); values stay sealed to the owner's vault.
 */
import { keyGrants } from '@meshhook/shared/lib/logicsrc-grants.js';

export async function POST({ request }) {
	const res = await keyGrants().webhookResponse(request);
	console.log(`[logicsrc-grant] webhook ${res.status}`);
	return res;
}
