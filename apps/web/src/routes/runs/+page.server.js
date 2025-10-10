import { requireAuth, getSupabase } from '$lib/auth.js';

/**
 * Load runs for the list view
 */
export async function load(event) {
	// Require authentication - will redirect to /login if not authenticated
	const user = requireAuth(event);
	const supabase = getSupabase(event);

	try {
		const { data: runs, error } = await supabase
			.from('workflow_runs')
			.select('*, workflow:workflow_definitions(slug)')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading runs:', error);
			return { runs: [], error: error.message };
		}

		return {
			runs: runs || [],
			user
		};
	} catch (error) {
		console.error('Error in runs load:', error);
		return { runs: [], error: error.message };
	}
}