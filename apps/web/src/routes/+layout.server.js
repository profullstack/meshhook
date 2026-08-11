/**
 * Root layout load — exposes the authenticated user to every page.
 *
 * hooks.server.js has already resolved the session cookie, so this just passes
 * the result down. The old `session` object came from the Supabase SDK and
 * carried access/refresh tokens; nothing in the UI used them, and a session
 * token has no business reaching the client, so only the user is returned.
 */

/**
 * @param {import('@sveltejs/kit').ServerLoadEvent} event
 */
export async function load(event) {
	return {
		user: event.locals.user
	};
}
