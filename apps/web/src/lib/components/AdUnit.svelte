<script>
	/**
	 * One CrawlProof ad unit (https://crawlproof.com/ads/slots).
	 *
	 * Race-free: the server renders the placeholder WITHOUT data-slot, so
	 * ad.js's own DOMContentLoaded pass skips it. On mount we measure the
	 * column, pick one format that fits, set data-format + data-slot and ask
	 * ad.js to scan. fill() guards on data-cp-filled, so repeat scans are safe.
	 * Never render two units and hide one: both would meter an impression.
	 *
	 * ad.js adds its own "Advertisement" caption (text_link carries
	 * "Sponsored"), so there is no label here. Collapsed until filled.
	 */
	import { onMount } from 'svelte';

	const AD_SLOT = '8f0045a4-6290-4f50-b385-1d9fdd157247';
	const AD_SCRIPT = 'https://crawlproof.com/ad.js';
	const SCAN_RETRY_MS = 200;
	const SCAN_MAX_TRIES = 25;

	/** @type {HTMLElement | undefined} */
	let el = $state();

	/** @param {number} width */
	function pickFormat(width) {
		if (width >= 728) return 'banner_728x90';
		if (width >= 300) return 'banner_300x250';
		return 'text_link';
	}

	onMount(() => {
		if (!el) return;
		el.setAttribute('data-format', pickFormat(el.clientWidth || window.innerWidth));
		el.setAttribute('data-slot', AD_SLOT);

		if (!document.querySelector(`script[src="${AD_SCRIPT}"]`)) {
			const s = document.createElement('script');
			s.src = AD_SCRIPT;
			s.async = true;
			document.body.appendChild(s);
		}

		let tries = 0;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let timer;
		const tick = () => {
			// @ts-ignore -- set by ad.js
			const ads = window.crawlproofAds;
			if (ads) {
				ads.scan();
				return;
			}
			if (++tries > SCAN_MAX_TRIES) return;
			timer = setTimeout(tick, SCAN_RETRY_MS);
		};
		tick();
		return () => clearTimeout(timer);
	});
</script>

<aside bind:this={el} data-cp-ad="" class="cp-ad"></aside>

<style>
	/* Collapsed until ad.js marks it data-cp-filled, so an unsold or blocked
	   slot leaves no hole. Heights = creative + ~16px caption. ad.js sets
	   data-cp-filled at runtime, so those selectors are :global() or Svelte
	   prunes them as unused. */
	.cp-ad {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 0;
		overflow: hidden;
		max-width: 100%;
		margin: 0 auto;
	}
	.cp-ad:global([data-cp-filled]) {
		height: auto;
		margin: 32px auto;
	}
	.cp-ad:global([data-cp-filled][data-format='banner_728x90']) {
		min-height: 106px;
	}
	.cp-ad:global([data-cp-filled][data-format='banner_300x250']) {
		min-height: 266px;
	}
	.cp-ad:global([data-cp-filled][data-format='text_link']) {
		min-height: 40px;
		align-items: stretch;
	}
</style>
