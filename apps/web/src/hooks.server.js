/**
 * SvelteKit Server Hooks
 *
 * Resolves the session cookie to a user on every request, and handles the
 * www -> non-www redirect.
 *
 * Previously this created a Supabase client per request and called
 * supabase.auth.getUser(). Sessions are now MeshHook's own rows in Turso, so
 * the cookie is looked up directly. event.locals.supabase is gone — routes take
 * event.locals.user and query the database through @meshhook/shared.
 */

import { validateSession, SESSION_COOKIE, sessionCookieOptions } from '@meshhook/shared/lib/auth.js';
import { dev } from '$app/environment';

/**
 * @param {Object} params
 * @param {import('@sveltejs/kit').RequestEvent} params.event
 * @param {Function} params.resolve
 * @returns {Promise<Response>}
 */
export async function handle({ event, resolve }) {
	const host = event.request.headers.get('host');

	if (host?.startsWith('www.')) {
		const nonWwwHost = host.slice(4);
		const url = new URL(event.request.url);
		const redirectUrl = `${url.protocol}//${nonWwwHost}${url.pathname}${url.search}${url.hash}`;

		return new Response(null, {
			status: 301,
			headers: { location: redirectUrl }
		});
	}

	const token = event.cookies.get(SESSION_COOKIE);
	const result = token ? await validateSession(token) : null;

	if (token && !result) {
		// Expired or revoked: clear it so the browser stops sending it.
		event.cookies.delete(SESSION_COOKIE, { path: '/' });
	} else if (result) {
		// validateSession slides the expiry forward; mirror that onto the cookie
		// so an active session is not logged out by the cookie expiring first.
		event.cookies.set(SESSION_COOKIE, token, sessionCookieOptions({ secure: !dev }));
	}

	event.locals.user = result?.user ?? null;
	event.locals.session = result?.session ?? null;

	return resolve(event);
}
