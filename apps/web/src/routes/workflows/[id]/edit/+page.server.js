import { requireAuth, getSupabase } from '$lib/auth.js';
import { error } from '@sveltejs/kit';

/**
 * Load workflow for editing
 * Requires authentication and verifies user has access to the workflow
 */
export async function load(event) {
	// Require authentication - will redirect to /auth/login if not authenticated
	const user = requireAuth(event);
	const supabase = getSupabase(event);
	const { id } = event.params;

	try {
		// Fetch workflow with project information to verify access
		const { data: workflow, error: fetchError } = await supabase
			.from('workflows')
			.select('*, project:projects!inner(id, owner)')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				throw error(404, 'Workflow not found');
			}
			console.error('Error fetching workflow:', fetchError);
			throw error(500, 'Failed to load workflow');
		}

		// Verify user has access to this workflow through project ownership
		// RLS policies should handle this, but we double-check for security
		if (!workflow || workflow.project?.owner !== user.id) {
			throw error(403, 'You do not have permission to access this workflow');
		}

		return {
			workflow,
			user
		};
	} catch (err) {
		// Re-throw SvelteKit errors (like redirects and error responses)
		if (err?.status) {
			throw err;
		}
		console.error('Error loading workflow:', err);
		throw error(500, 'Failed to load workflow');
	}
}