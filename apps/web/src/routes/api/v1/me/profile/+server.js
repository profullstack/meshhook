/**
 * GET/PUT/PATCH /api/v1/me/profile — the signed-in user's profile
 * (@profullstack/profile: first/last name, company domain, job title, LinkedIn).
 * 401 JSON without a session.
 */

import { createProfileHandlers } from '@profullstack/profile';
import { profileStore } from '@meshhook/shared/lib/profile.js';

/** Built on first request, so importing the route (e.g. at build) never connects. */
let handlers;
const h = () =>
	(handlers ??= createProfileHandlers({
		store: profileStore(),
		/** @param {Request} _request @param {any} event */
		getUser: (_request, event) =>
			event.locals.user ? { id: event.locals.user.id, email: event.locals.user.email } : null
	}));

/** @param {import('@sveltejs/kit').RequestEvent} event */
export const GET = (event) => h().GET(event.request, event);
/** @param {import('@sveltejs/kit').RequestEvent} event */
export const PUT = (event) => h().PUT(event.request, event);
/** @param {import('@sveltejs/kit').RequestEvent} event */
export const PATCH = (event) => h().PATCH(event.request, event);
