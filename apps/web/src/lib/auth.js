/**
 * Authentication utilities for server-side route protection.
 *
 * getSupabase() is gone along with Supabase itself. Routes that need data now
 * import the query helpers from @meshhook/shared/lib/authz.js, which apply the
 * per-user scoping that RLS used to enforce in the database.
 */

import { redirect } from '@sveltejs/kit';

/**
 * Require authentication for a page route.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {object} the authenticated user
 * @throws {redirect} to /auth/login when not authenticated
 */
export function requireAuth(event) {
	const user = event.locals.user;

	if (!user) {
		// Preserve where the user was headed so login can send them back.
		const next = encodeURIComponent(event.url.pathname + event.url.search);
		throw redirect(303, `/auth/login?next=${next}`);
	}

	return user;
}

/**
 * Get the authenticated user, or null.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {object|null}
 */
export function getUser(event) {
	return event.locals.user ?? null;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {boolean}
 */
export function isAuthenticated(event) {
	return !!event.locals.user;
}

/**
 * Require authentication for an API route.
 *
 * Returns the user when authenticated, or a 401 Response otherwise. Callers
 * must check with `instanceof Response` before using the result:
 *
 *     const user = requireApiAuth(event);
 *     if (user instanceof Response) return user;
 *
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {object|Response}
 */
export function requireApiAuth(event) {
	const user = event.locals.user;

	if (!user) {
		return new Response(
			JSON.stringify({
				error: 'Unauthorized',
				message: 'Authentication required'
			}),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	return user;
}
