import { createServerSupabaseClient } from '$lib/supabase.js';

/**
 * Load secrets and projects for the secrets vault
 */
export async function load(event) {
	const supabase = createServerSupabaseClient(event);

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return { secrets: [], projects: [] };
		}

		// Load secrets with project info
		const { data: secrets, error: secretsError } = await supabase
			.from('secrets')
			.select('*, project:projects(name)')
			.order('created_at', { ascending: false });

		if (secretsError) {
			console.error('Error loading secrets:', secretsError);
		}

		// Load projects for filtering
		const { data: projects, error: projectsError } = await supabase
			.from('projects')
			.select('id, name')
			.order('name');

		if (projectsError) {
			console.error('Error loading projects:', projectsError);
		}

		return {
			secrets: secrets || [],
			projects: projects || []
		};
	} catch (error) {
		console.error('Error in secrets load:', error);
		return { secrets: [], projects: [], error: error.message };
	}
}