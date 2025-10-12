import { requireAuth, getSupabase } from '$lib/auth.js';

/**
 * Load workflows for the list view
 */
export async function load(event) {
	// Require authentication - will redirect to /login if not authenticated
	const user = requireAuth(event);
	const supabase = getSupabase(event);

	try {
		// Get user's projects first
		const { data: projects, error: projectsError } = await supabase
			.from('projects')
			.select('id')
			.eq('owner', user.id);

		if (projectsError) {
			console.error('Error loading projects:', projectsError);
			return { workflows: [], error: projectsError.message };
		}

		// If user has no projects, return empty list
		if (!projects || projects.length === 0) {
			return { workflows: [], user };
		}

		const projectIds = projects.map((p) => p.id);

		// Fetch workflows only from user's projects
		// RLS policies will also enforce this, but we add explicit filter for defense-in-depth
		const { data: workflows, error } = await supabase
			.from('workflows')
			.select('*')
			.in('project_id', projectIds)
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