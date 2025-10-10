import { createServerSupabaseClient } from '$lib/supabase.js';

/**
 * Load runs for the list view
 */
export async function load(event) {
	const supabase = createServerSupabaseClient(event);

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return { runs: [] };
		}

		const { data: runs, error } = await supabase
			.from('runs')
			.select('*, workflow:workflows(name)')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading runs:', error);
			return { runs: [], error: error.message };
		}

		return { runs: runs || [] };
	} catch (error) {
		console.error('Error in runs load:', error);
		return { runs: [], error: error.message };
	}
}