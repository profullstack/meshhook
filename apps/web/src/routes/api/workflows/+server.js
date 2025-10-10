import { createServerSupabaseClient } from '$lib/supabase.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/workflows - List all workflows for the current user
 */
export async function GET(event) {
	const supabase = createServerSupabaseClient(event);

	try {
		const {
			data: { user },
			error: authError
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data, error } = await supabase
			.from('workflows')
			.select('*')
			.order('updated_at', { ascending: false });

		if (error) throw error;

		return json({ workflows: data });
	} catch (error) {
		console.error('Error fetching workflows:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * POST /api/workflows - Create a new workflow
 */
export async function POST(event) {
	const supabase = createServerSupabaseClient(event);

	try {
		const {
			data: { user },
			error: authError
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await event.request.json();
		const { name, description, nodes, edges, status = 'draft' } = body;

		// Validate required fields
		if (!name) {
			return json({ error: 'Workflow name is required' }, { status: 400 });
		}

		// Get or create default project for user
		let { data: project, error: projectError } = await supabase
			.from('projects')
			.select('id')
			.eq('owner', user.id)
			.limit(1)
			.single();

		// If no project exists, create a default one
		if (projectError || !project) {
			const { data: newProject, error: createError } = await supabase
				.from('projects')
				.insert({
					owner: user.id,
					name: 'Default Project'
				})
				.select('id')
				.single();

			if (createError) {
				console.error('Error creating default project:', createError);
				return json({ error: 'Failed to create default project' }, { status: 500 });
			}

			project = newProject;
		}

		// Generate slug from name if not provided
		const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

		// Create workflow
		const { data, error } = await supabase
			.from('workflows')
			.insert({
				project_id: project.id,
				slug,
				name,
				description,
				definition: { nodes, edges },
				status,
				user_id: user.id,
				version: 1
			})
			.select()
			.single();

		if (error) throw error;

		return json({ workflow: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating workflow:', error);
		return json({ error: error.message }, { status: 500 });
	}
}