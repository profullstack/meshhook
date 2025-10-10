/**
 * SvelteKit Server Hooks
 * Handles server-side middleware including www to non-www redirects
 */

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

	// Continue with normal request handling
	const response = await resolve(event);
	return response;
}