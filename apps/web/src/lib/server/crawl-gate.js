/**
 * The crawl door: AI training crawlers, headless browsers and SEO scrapers buy a
 * day pass ($1 a day over x402, or any coin / PayPal through CoinPay's hosted
 * checkout) on /crawl, and get a 402 everywhere else. People, verified search
 * crawlers, AI chat/search fetchers and signed-in users are never charged, and
 * the API (webhook triggers included) is never metered. Built only with a scoped
 * key and a payee, so a local or self-hosted server never sells.
 */
import { createGateway } from '@profullstack/x402-gateway';

/** @param {Record<string, string | undefined>} env */
export function createCrawlGate(env = process.env) {
	const apiKey = env.COINPAY_X402_KEY || '';
	const payTo = env.CRAWL_PAY_TO || '';
	if (!apiKey || !payTo) return null;
	return createGateway({
		siteUrl: (env.SITE_URL || 'https://meshhook.com').replace(/\/+$/, ''),
		siteName: 'MeshHook',
		coinpay: { apiKey },
		payTo,
		contact: 'mailto:anthony@profullstack.com',
		openPaths: ['/api/', '/llms.txt'],
		exempt: (request) => /(?:^|;\s*)meshhook_session=/.test(request.headers.get('cookie') ?? '')
	});
}

export const crawlGate = createCrawlGate();
