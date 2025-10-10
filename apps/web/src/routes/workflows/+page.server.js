import { requireAuth, getSupabase } from '$lib/auth.js';

/**
 * Load workflows for the list view
 */
export async function load(event) {
	// Require authentication - will redirect to /login if not authenticated
	const user = requireAuth(event);
	const supabase = getSupabase(event);

	try {
		const { data: workflows, error } = await supabase
			.from('workflows')
			.select('*')
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error loading workflows:', error);
			return { workflows: [], error: error.message };
		}

		return {
			workflows: workflows || [],
			user
		};
	} catch (error) {
		console.error('Error in workflows load:', error);
		return { workflows: [], error: error.message };
	}
}