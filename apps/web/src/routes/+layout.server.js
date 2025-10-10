import { createServerSupabaseClient } from '$lib/supabase.js';

/**
 * Load function for root layout - handles authentication state
 * @param {import('@sveltejs/kit').ServerLoadEvent} event
 */
export async function load(event) {
	const supabase = createServerSupabaseClient(event);

	// Get the current session
	const {
		data: { session },
		error
	} = await supabase.auth.getSession();

	if (error) {
		console.error('Error fetching session:', error);
	}

	return {
		session
	};
}