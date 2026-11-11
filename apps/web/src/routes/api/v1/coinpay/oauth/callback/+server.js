/**
 * GET /api/v1/coinpay/oauth/callback — finish Sign in / Connect with CoinPay.
 *
 * Accounts bind to the CoinPay `sub` (user_identities), never to the email
 * CoinPay reports (it is unverified): a signed-out login with an unknown sub
 * makes a NEW account with a placeholder email; linking to an existing account
 * happens only while signed in to it.
 */

import { redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { dev } from '$app/env';
import { db } from '@meshhook/shared/lib/db.js';
import { createSession, createUser, SESSION_COOKIE, sessionCookieOptions } from '@meshhook/shared/lib/auth.js';
import { ensureDefaultProject } from '@meshhook/shared/lib/authz.js';
import { sealUserSecret, VaultMissingError } from '@meshhook/shared/lib/vault.js';
import {
	CONNECT_SECRET,
	CoinpayOAuthError,
	exchangeCode,
	linkSub,
	oauthConfig,
	placeholderEmail,
	tokenRecord,
	userForSub,
	userinfo
} from '@meshhook/shared/lib/coinpay-oauth.js';
import { COINPAY_FLOW_COOKIE as COOKIE } from '$lib/server/coinpay-flow.js';

async function startSession(event, userId) {
	const { token } = await createSession(userId, {
		userAgent: event.request.headers.get('user-agent'),
		ipAddress: event.getClientAddress()
	});
	event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions({ secure: !dev }));
}

export async function GET(event) {
	const { url, cookies, locals } = event;
	let flow;
	try {
		flow = JSON.parse(cookies.get(COOKIE) ?? 'null');
	} catch {
		flow = null;
	}
	cookies.delete(COOKIE, { path: '/api/v1/coinpay/oauth' });

	const fail = (why) => {
		console.error(`[coinpay-oauth] ${why}`);
		throw redirect(303, flow?.i === 'connect' ? `/secrets?coinpay=failed` : `/auth/login?coinpay=failed`);
	};

	const cfg = oauthConfig();
	if (!cfg) fail('not configured');
	if (url.searchParams.get('error')) fail(`authorize: ${url.searchParams.get('error')}`);
	const code = url.searchParams.get('code');
	if (!flow?.s || !flow?.v || !code || url.searchParams.get('state') !== flow.s) fail('state mismatch or missing code');

	let tokens, info;
	try {
		tokens = await exchangeCode(cfg, { code, verifier: flow.v });
		info = await userinfo(tokens.access_token);
	} catch (e) {
		fail(e.message);
	}
	const sub = String(info.sub);

	if (flow.i === 'connect') {
		if (!locals.user) throw redirect(303, '/auth/login?next=/secrets');
		try {
			await linkSub(db, sub, locals.user.id);
			const projectId = await ensureDefaultProject(locals.user.id, 'Default Project');
			const sealed = await sealUserSecret(db, locals.user.id, CONNECT_SECRET, JSON.stringify(tokenRecord(tokens)));
			await db.none(
				`insert into secrets (project_id, key, value_encrypted) values (?, ?, ?)
				 on conflict (project_id, key) do update set value_encrypted = excluded.value_encrypted`,
				[projectId, CONNECT_SECRET, sealed]
			);
		} catch (e) {
			if (e instanceof VaultMissingError) throw redirect(303, '/secrets?coinpay=needs-vault');
			if (e instanceof CoinpayOAuthError && e.status === 409) throw redirect(303, '/secrets?coinpay=linked-elsewhere');
			fail(`connect: ${e.message}`);
		}
		throw redirect(303, `${flow.next ?? '/secrets'}${(flow.next ?? '').includes('?') ? '&' : '?'}coinpay=connected`);
	}

	// Sign in.
	let userId;
	try {
		if (locals.user) {
			await linkSub(db, sub, locals.user.id);
			userId = locals.user.id;
		} else {
			userId = await userForSub(db, sub);
			if (!userId) {
				const user = await createUser({ email: placeholderEmail(sub), password: randomBytes(24).toString('base64url') });
				await linkSub(db, sub, user.id);
				await ensureDefaultProject(user.id, 'Default Project');
				userId = user.id;
			}
		}
	} catch (e) {
		if (e instanceof CoinpayOAuthError && e.status === 409) throw redirect(303, '/workflows?coinpay=linked-elsewhere');
		fail(`login: ${e.message}`);
	}
	if (!locals.user) await startSession(event, userId);
	throw redirect(303, flow.next ?? '/workflows');
}
