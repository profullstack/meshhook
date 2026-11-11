/**
 * GET /api/v1/coinpay/oauth/start?intent=login|connect&next=/path
 *
 * login    "Sign in with CoinPay" (openid profile email)
 * connect  "Connect CoinPay": a merchant-scoped token sealed into the
 *          COINPAY_CONNECT secret for the CoinPay plugin. Needs a session.
 *
 * The PKCE verifier, state, nonce and intent ride in a short-lived httpOnly
 * cookie. Who to link to is NEVER read from it: the callback uses the session.
 */

import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { CONNECT_SCOPE, LOGIN_SCOPE, authorizeUrl, newAuthRequest, oauthConfig } from '@meshhook/shared/lib/coinpay-oauth.js';

import { COINPAY_FLOW_COOKIE as COOKIE } from '$lib/server/coinpay-flow.js';

function safeNext(next, fallback) {
	return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

export function GET({ url, cookies, locals }) {
	const cfg = oauthConfig();
	const intent = url.searchParams.get('intent') === 'connect' ? 'connect' : 'login';
	if (!cfg) throw redirect(303, intent === 'connect' ? '/secrets?coinpay=unavailable' : '/auth/login?coinpay=unavailable');
	if (intent === 'connect' && !locals.user) throw redirect(303, `/auth/login?next=${encodeURIComponent('/secrets')}`);

	const req = newAuthRequest();
	const next = safeNext(url.searchParams.get('next'), intent === 'connect' ? '/secrets' : '/workflows');
	cookies.set(COOKIE, JSON.stringify({ v: req.verifier, s: req.state, n: req.nonce, i: intent, next }), {
		path: '/api/v1/coinpay/oauth',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 600
	});
	throw redirect(303, authorizeUrl(cfg, { ...req, scope: intent === 'connect' ? CONNECT_SCOPE : LOGIN_SCOPE }));
}
