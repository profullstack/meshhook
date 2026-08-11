/**
 * POST /auth/logout - Sign out the current user.
 *
 * Deleting the session row revokes it server-side immediately, which the old
 * Supabase JWTs could not do — they stayed valid until they expired.
 */

import { redirect } from '@sveltejs/kit';
import { destroySession, SESSION_COOKIE } from '@meshhook/shared/lib/auth.js';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function POST(event) {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		await destroySession(token);
	}

	// Clear the cookie even if there was no session, so a stale one cannot linger.
	event.cookies.delete(SESSION_COOKIE, { path: '/' });

	throw redirect(303, '/auth/login');
}
