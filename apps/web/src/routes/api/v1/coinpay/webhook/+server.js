/**
 * POST /api/v1/coinpay/webhook — CoinPay business events for meshhook.com
 * (set by coinpay-onboard). Verified with COINPAY_WEBHOOK_SECRET from the
 * logicsrc vault; recorded in the log for now, nothing is sold yet.
 */

import { json } from '@sveltejs/kit';
import { verifyCoinpaySignature } from '@meshhook/shared/lib/coinpay-oauth.js';

export async function POST({ request }) {
	const raw = await request.text();
	if (!verifyCoinpaySignature(raw, request.headers.get('x-coinpay-signature'), process.env.COINPAY_WEBHOOK_SECRET)) {
		return json({ error: 'invalid signature' }, { status: 401 });
	}
	let event = {};
	try {
		event = JSON.parse(raw);
	} catch {
		/* signed but not JSON: still acknowledged */
	}
	console.log(`[coinpay-webhook] ${event.type ?? event.event ?? 'event'} ${event.data?.id ?? event.id ?? ''}`.trim());
	return json({ received: true });
}
