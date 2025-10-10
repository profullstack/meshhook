import { getSupabase, getUser } from '$lib/auth.js';
import { json } from '@sveltejs/kit';

/**
 * PUT /api/secrets/[id] - Update a secret
 */
export async function PUT(event) {
	const user = getUser(event);
	
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const supabase = getSupabase(event);
	const { id } = event.params;

	try {
		const body = await event.request.json();
		const { value, description } = body;

		const updates = {
			updated_at: new Date().toISOString()
		};

		if (value !== undefined) updates.encrypted_value = value;
		if (description !== undefined) updates.description = description;

		const { data, error } = await supabase
			.from('secrets')
			.update(updates)
			.eq('id', id)
			.select('*, project:projects(name)')
			.single();

		if (error) throw error;

		return json({ secret: data });
	} catch (error) {
		console.error('Error updating secret:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * DELETE /api/secrets/[id] - Delete a secret
 */
export async function DELETE(event) {
	const user = getUser(event);
	
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const supabase = getSupabase(event);
	const { id } = event.params;

	try {
		const { error } = await supabase.from('secrets').delete().eq('id', id);

		if (error) throw error;

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting secret:', error);
		return json({ error: error.message }, { status: 500 });
	}
}