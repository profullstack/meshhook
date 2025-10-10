import { createServerSupabaseClient } from '$lib/supabase.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/workflows/[id] - Get a specific workflow
 */
export async function GET(event) {
	const supabase = createServerSupabaseClient(event);
	const { id } = event.params;

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { data, error } = await supabase.from('workflows').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') {
				return json({ error: 'Workflow not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ workflow: data });
	} catch (error) {
		console.error('Error fetching workflow:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * PUT /api/workflows/[id] - Update a workflow
 */
export async function PUT(event) {
	const supabase = createServerSupabaseClient(event);
	const { id } = event.params;

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await event.request.json();
		const { name, description, nodes, edges, status } = body;

		// Build update object
		const updates = {
			updated_at: new Date().toISOString()
		};

		if (name !== undefined) updates.name = name;
		if (description !== undefined) updates.description = description;
		if (nodes !== undefined || edges !== undefined) {
			updates.definition = { nodes, edges };
		}
		if (status !== undefined) updates.status = status;

		const { data, error } = await supabase
			.from('workflows')
			.update(updates)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return json({ error: 'Workflow not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ workflow: data });
	} catch (error) {
		console.error('Error updating workflow:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * DELETE /api/workflows/[id] - Delete a workflow
 */
export async function DELETE(event) {
	const supabase = createServerSupabaseClient(event);
	const { id } = event.params;

	try {
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { error } = await supabase.from('workflows').delete().eq('id', id);

		if (error) {
			if (error.code === 'PGRST116') {
				return json({ error: 'Workflow not found' }, { status: 404 });
			}
			throw error;
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting workflow:', error);
		return json({ error: error.message }, { status: 500 });
	}
}