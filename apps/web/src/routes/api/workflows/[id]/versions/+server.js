import { createServerSupabaseClient } from '$lib/supabase.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/workflows/[id]/versions - Get version history
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

		const { data: versions, error } = await supabase
			.from('workflow_versions')
			.select('*')
			.eq('workflow_id', id)
			.order('version', { ascending: false });

		if (error) throw error;

		return json({ versions: versions || [] });
	} catch (error) {
		console.error('Error fetching versions:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * POST /api/workflows/[id]/versions - Create new version (rollback)
 */
export async function POST(event) {
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
		const { version_id, description } = body;

		// Get the version to rollback to
		const { data: sourceVersion, error: fetchError } = await supabase
			.from('workflow_versions')
			.select('*')
			.eq('id', version_id)
			.single();

		if (fetchError) throw fetchError;

		// Get current max version
		const { data: maxVersionData } = await supabase
			.from('workflow_versions')
			.select('version')
			.eq('workflow_id', id)
			.order('version', { ascending: false })
			.limit(1)
			.single();

		const newVersion = (maxVersionData?.version || 0) + 1;

		// Create new version from source
		const { data: newVersionData, error: createError } = await supabase
			.from('workflow_versions')
			.insert({
				workflow_id: id,
				version: newVersion,
				definition: sourceVersion.definition,
				description: description || `Rolled back to v${sourceVersion.version}`,
				status: 'draft',
				is_current: true
			})
			.select()
			.single();

		if (createError) throw createError;

		// Update workflow with new version
		const { error: updateError } = await supabase
			.from('workflows')
			.update({
				definition: sourceVersion.definition,
				version: newVersion,
				status: 'draft',
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updateError) throw updateError;

		return json({ version: newVersionData }, { status: 201 });
	} catch (error) {
		console.error('Error creating version:', error);
		return json({ error: error.message }, { status: 500 });
	}
}