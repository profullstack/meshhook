import { createServerSupabaseClient } from '$lib/supabase.js';
import { error } from '@sveltejs/kit';

/**
 * Load workflow for editing
 */
export async function load(event) {
	const supabase = createServerSupabaseClient(event);
	const { id } = event.params;

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			throw error(401, 'Unauthorized');
		}

		const { data: workflow, error: fetchError } = await supabase
			.from('workflows')
			.select('*')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw error(404, 'Workflow not found');
			}
			throw fetchError;
		}

		return { workflow };
	} catch (err) {
		console.error('Error loading workflow:', err);
		throw error(err.status || 500, err.message || 'Failed to load workflow');
	}
}