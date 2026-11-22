/**
 * GET /sitemap.xml: the public pages. Workflows, runs and secrets need an
 * account (they 303 to the sign-in page), and /api is not pages.
 */

const SITE = (process.env.SITE_URL || 'https://meshhook.com').replace(/\/+$/, '');
const PAGES = ['/', '/auth/login'];

export function GET() {
	const urls = PAGES.map((path) => `  <url><loc>${SITE}${path}</loc></url>`).join('\n');
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
}
