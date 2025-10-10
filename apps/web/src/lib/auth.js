/**
 * Authentication utilities for server-side route protection
 * Provides helpers for checking authentication and redirecting unauthorized users
 */

import { redirect } from '@sveltejs/kit';

/**
 * Require authentication for a route
 * Redirects to login if user is not authenticated
 * @param {object} event - SvelteKit event object
 * @returns {object} user object if authenticated
 * @throws {redirect} Redirects to /login if not authenticated
 */
export function requireAuth(event) {
	const user = event.locals.user;

	if (!user) {
		throw redirect(303, '/login');
	}

	return user;
}

/**
 * Get authenticated user from event.locals
 * Returns null if not authenticated (does not redirect)
 * @param {object} event - SvelteKit event object
 * @returns {object|null} user object or null
 */
export function getUser(event) {
	return event.locals.user ?? null;
}

/**
 * Check if user is authenticated
 * @param {object} event - SvelteKit event object
 * @returns {boolean} true if authenticated
 */
export function isAuthenticated(event) {
	return !!event.locals.user;
}

/**
 * Get Supabase client from event.locals
 * @param {object} event - SvelteKit event object
 * @returns {object} Supabase client
 */
export function getSupabase(event) {
	return event.locals.supabase;
}

/**
 * Require authentication for API routes
 * Returns 401 Unauthorized if user is not authenticated
 * @param {object} event - SvelteKit event object
 * @returns {object} user object if authenticated
 * @throws {Response} Returns 401 if not authenticated
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
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}

	return user;
}

/**
 * Verify user has access to a project
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} true if user has access
 */
export async function verifyProjectAccess(supabase, userId, projectId) {
	const { data, error } = await supabase
		.from('projects')
		.select('id')
		.eq('id', projectId)
		.eq('owner', userId)
		.single();

	return !error && !!data;
}