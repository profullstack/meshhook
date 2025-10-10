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
<<<<<<< HEAD
 * When publishing (status='published'), creates a new version
=======
>>>>>>> 3986f768f8c9ca7736e6e459fcb7b247cbf96501
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

<<<<<<< HEAD
		// Get current workflow to check if we're publishing
		const { data: currentWorkflow, error: fetchError } = await supabase
			.from('workflow_definitions')
			.select('*')
			.eq('id', id)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				return json({ error: 'Workflow not found' }, { status: 404 });
			}
			throw fetchError;
		}

		// Check if we're publishing a draft workflow
		const isPublishing = status === 'published' && currentWorkflow.status === 'draft';

		if (isPublishing) {
			// When publishing, create a new version
			// Get the max version for this workflow slug
			const { data: maxVersionData } = await supabase
				.from('workflow_definitions')
				.select('version')
				.eq('project_id', currentWorkflow.project_id)
				.eq('slug', currentWorkflow.slug)
				.order('version', { ascending: false })
				.limit(1)
				.single();

			const newVersion = (maxVersionData?.version || 0) + 1;

			// Create new version entry
			const { data: newVersionData, error: insertError } = await supabase
				.from('workflow_definitions')
				.insert({
					project_id: currentWorkflow.project_id,
					slug: currentWorkflow.slug,
					name: name ?? currentWorkflow.name,
					description: description ?? currentWorkflow.description,
					version: newVersion,
					definition: nodes !== undefined || edges !== undefined
						? { nodes, edges }
						: currentWorkflow.definition,
					status: 'published',
					user_id: currentWorkflow.user_id
				})
				.select()
				.single();

			if (insertError) {
				throw insertError;
			}

			// Archive the old draft version
			await supabase
				.from('workflow_definitions')
				.update({ status: 'archived' })
				.eq('id', id);

			return json({ workflow: newVersionData });
		} else {
			// For non-publishing updates (draft edits), update in place
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
				.from('workflow_definitions')
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
		}
=======
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
>>>>>>> 3986f768f8c9ca7736e6e459fcb7b247cbf96501
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