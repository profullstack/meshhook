import { createServerSupabaseClient } from '$lib/supabase.js';
import { redirect } from '@sveltejs/kit';

/**
 * POST /auth/logout - Sign out the current user
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function POST(event) {
	const supabase = createServerSupabaseClient(event);

	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('Error signing out:', error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	throw redirect(303, '/auth/login');
}