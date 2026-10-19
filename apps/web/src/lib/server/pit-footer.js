/**
 * The pit.world network footer, fetched server-side from pit.world/snippets.
 *
 * Module-level cache: a copy older than an hour is refreshed (3 s timeout) and a
 * failed fetch keeps serving the stale copy. With no copy at all the footer is
 * the empty string, so it can never break a page.
 */
const PIT_FOOTER_URL = 'https://pit.world/snippets/footer.html?site=meshhook.com';
const TTL_MS = 60 * 60 * 1000;

let html = '';
let fetchedAt = 0;
/** @type {Promise<void> | null} */
let inflight = null;

function refresh() {
	inflight ??= fetch(PIT_FOOTER_URL, { signal: AbortSignal.timeout(3000) })
		.then(async (res) => {
			if (!res.ok) throw new Error(`pit footer ${res.status}`);
			const text = await res.text();
			if (!text.includes('data-pit-footer')) throw new Error('pit footer: unexpected body');
			html = text;
			fetchedAt = Date.now();
		})
		.catch(() => {})
		.finally(() => {
			inflight = null;
		});
	return inflight;
}

/** @returns {Promise<string>} */
export async function pitFooter() {
	if (Date.now() - fetchedAt > TTL_MS) {
		// Only wait when there is nothing to serve yet; otherwise refresh in the background.
		if (html) refresh();
		else await refresh();
	}
	return html;
}
