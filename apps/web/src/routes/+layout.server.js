/**
 * Root layout load — exposes the authenticated user to every page.
 *
 * hooks.server.js has already resolved the session cookie, so this just passes
 * the result down. The old `session` object came from the Supabase SDK and
 * carried access/refresh tokens; nothing in the UI used them, and a session
 * token has no business reaching the client, so only the user is returned.
 *
 * It also renders the site footer, the shared Profullstack footer
 * (@profullstack/footer: a Source link, the << Profullstack >> webring and the
 * copyright) from the package's @latest template, on the server, so the ring's
 * verifier sees it and a package release reaches the site without a redeploy
 * (the package caches the template). The pit.world footer is appended after it
 * in hooks.server.js.
 */
import { footerHtml } from '@profullstack/footer';

/**
 * @param {import('@sveltejs/kit').ServerLoadEvent} event
 */
export async function load(event) {
	return {
		user: event.locals.user,
		footer: await footerHtml({
			site: 'https://meshhook.com/',
			links: [{ label: 'Source', href: 'https://github.com/profullstack/meshhook' }]
		})
	};
}
