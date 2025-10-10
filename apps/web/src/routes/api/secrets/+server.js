import { getSupabase, getUser } from '$lib/auth.js';
import { json } from '@sveltejs/kit';

/**
 * GET /api/secrets - List all secrets
 */
export async function GET(event) {
	const user = getUser(event);
	
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const supabase = getSupabase(event);

	try {
		const { data: secrets, error } = await supabase
			.from('secrets')
			.select('*, project:projects(name)')
			.order('created_at', { ascending: false });

		if (error) throw error;

		return json({ secrets: secrets || [] });
	} catch (error) {
		console.error('Error fetching secrets:', error);
		return json({ error: error.message }, { status: 500 });
	}
}

/**
 * POST /api/secrets - Create a new secret
 */
export async function POST(event) {
	const user = getUser(event);
	
	if (!user) {
		return json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
	}

	const supabase = getSupabase(event);

	try {
		const body = await event.request.json();
		const { name, value, project_id, description } = body;

		if (!name || !value) {
			return json({ error: 'Name and value are required' }, { status: 400 });
		}

		// Create secret (encryption handled by database trigger)
		const { data, error } = await supabase
			.from('secrets')
			.insert({
				name,
				encrypted_value: value, // Will be encrypted by DB
				project_id,
				description
			})
			.select('*, project:projects(name)')
			.single();

		if (error) throw error;

		return json({ secret: data }, { status: 201 });
	} catch (error) {
		console.error('Error creating secret:', error);
		return json({ error: error.message }, { status: 500 });
	}
}