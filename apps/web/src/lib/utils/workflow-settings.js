/**
 * Run settings stored inside a workflow definition (`definition.settings`).
 * The orchestrator reads them: src/engine/c0mpute.js and workers/orchestrator.mjs.
 */

const PEER_ID = /^[1-9A-HJ-NP-Za-km-z]{30,80}$/;

/**
 * Keep only the run settings the engine understands:
 *   execution  'local' | 'c0mpute' (absent = server default)
 *   c0mpute    { private, allowPeers: [libp2p peer ids], maxPrice }
 *   retryAttempts (1-10), retryDelay (ms), timeout (ms)
 */
export function sanitizeSettings(raw) {
	if (!raw || typeof raw !== 'object') return null;
	const out = {};
	if (raw.execution === 'local' || raw.execution === 'c0mpute') out.execution = raw.execution;
	const c = raw.c0mpute;
	if (c && typeof c === 'object') {
		const c0 = {};
		if (c.private === true) c0.private = true;
		if (Array.isArray(c.allowPeers)) {
			const peers = c.allowPeers.map((p) => String(p).trim()).filter((p) => PEER_ID.test(p)).slice(0, 32);
			if (peers.length) c0.allowPeers = peers;
		}
		if (Number.isFinite(Number(c.maxPrice)) && c.maxPrice !== null && c.maxPrice !== '') c0.maxPrice = Math.max(0, Number(c.maxPrice));
		if (Object.keys(c0).length) out.c0mpute = c0;
	}
	for (const [k, lo, hi] of [['retryAttempts', 1, 10], ['retryDelay', 250, 300000], ['timeout', 1000, 3600000]]) {
		const v = Number(raw[k]);
		if (raw[k] != null && Number.isFinite(v)) out[k] = Math.min(hi, Math.max(lo, Math.round(v)));
	}
	return Object.keys(out).length ? out : null;
}

/** The editor's "Runs on" choice, from stored settings. */
export function runsOnFrom(settings) {
	if (settings?.c0mpute?.private) return 'private';
	return settings?.execution ?? 'auto';
}

/** Stored settings for a "Runs on" choice, keeping everything else. */
export function withRunsOn(settings, runsOn) {
	const next = { ...(settings ?? {}) };
	const c0 = { ...(next.c0mpute ?? {}) };
	delete next.execution;
	delete c0.private;
	if (runsOn === 'local' || runsOn === 'c0mpute') next.execution = runsOn;
	if (runsOn === 'private') c0.private = true;
	if (Object.keys(c0).length) next.c0mpute = c0;
	else delete next.c0mpute;
	return next;
}
