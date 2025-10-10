/**
 * SvelteKit Server Hooks
 * Handles server-side middleware including authentication and www to non-www redirects
 */

import { createServerSupabaseClient } from '$lib/supabase.js';

/**
 * Handle function runs on every server request
 * @param {Object} params
 * @param {Request} params.event - The request event
 * @param {Function} params.resolve - Function to resolve the request
 * @returns {Promise<Response>}
 */
export async function handle({ event, resolve }) {
	// Get the host from the request headers
	const host = event.request.headers.get('host');

	// Check if the host starts with 'www.'
	if (host?.startsWith('www.')) {
		// Extract the non-www domain
		const nonWwwHost = host.slice(4); // Remove 'www.' prefix

		// Get the full URL
		const url = new URL(event.request.url);

		// Construct the redirect URL with the non-www host
		const redirectUrl = `${url.protocol}//${nonWwwHost}${url.pathname}${url.search}${url.hash}`;

		// Return a 301 permanent redirect
		return new Response(null, {
			status: 301,
			headers: {
				location: redirectUrl
			}
		});
	}

	// Create Supabase client for this request
	const supabase = createServerSupabaseClient(event);

	// Get the session using getUser() for security (not getSession())
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	// Make user available to all routes via event.locals
	event.locals.supabase = supabase;
	event.locals.user = user;
	event.locals.getSession = async () => {
		const {
			data: { session }
		} = await supabase.auth.getSession();
		return session;
	};

	// Continue with normal request handling
	const response = await resolve(event);
	return response;
}