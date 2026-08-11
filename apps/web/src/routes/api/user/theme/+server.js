/**
 * GET/POST /api/user/theme — read and persist the user's theme preference.
 *
 * Ported off the Supabase client. The upsert is now an explicit
 * `on conflict (user_id) do update`, which the unique index on
 * user_settings.user_id supports.
 */

import { json } from '@sveltejs/kit';
import { db } from '@meshhook/shared/lib/db.js';

const VALID_THEMES = ['light', 'dark'];

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function POST(event) {
	const user = event.locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let theme;
	try {
		({ theme } = await event.request.json());
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (!VALID_THEMES.includes(theme)) {
		return json({ error: 'Invalid theme' }, { status: 400 });
	}

	try {
		await db.none(
			`insert into user_settings (user_id, theme_preference) values (?, ?)
			 on conflict (user_id) do update set theme_preference = excluded.theme_preference`,
			[user.id, theme]
		);
	} catch (error) {
		console.error('Failed to update theme:', error);
		return json({ error: 'Failed to update theme' }, { status: 500 });
	}

	return json({ success: true, theme });
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET(event) {
	const user = event.locals.user;

	// Anonymous visitors get the default rather than a 401 — the theme is used
	// to render the shell before sign-in.
	if (!user) {
		return json({ theme: 'light' });
	}

	try {
		const row = await db.oneOrNone(
			'select theme_preference from user_settings where user_id = ?',
			[user.id]
		);
		return json({ theme: row?.theme_preference ?? 'light' });
	} catch (error) {
		console.error('Failed to read theme:', error);
		return json({ theme: 'light' });
	}
}
