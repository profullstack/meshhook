import { createServerSupabaseClient } from '$lib/supabase.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/workflows - List all workflows for the current user
 */
export async function GET(event) {
	const supabase = createServerSupabaseClient(event);

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
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
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await event.request.json();
		const { name, description, nodes, edges, status = 'draft' } = body;

		// Validate required fields
		if (!name) {
			return json({ error: 'Workflow name is required' }, { status: 400 });
		}

		// Create workflow
		const { data, error } = await supabase
			.from('workflows')
			.insert({
				name,
				description,
				definition: { nodes, edges },
				status,
				user_id: session.user.id,
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