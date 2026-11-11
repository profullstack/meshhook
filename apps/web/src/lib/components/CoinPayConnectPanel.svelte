<script>
	// "Connect CoinPay": a merchant-scoped CoinPay token, sealed to your key
	// vault as the COINPAY_CONNECT secret. CoinPay plugin nodes use it by
	// default, so nobody pastes an API key. Runs refresh it automatically while
	// your vault is unlocked for runs.
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let connected = $state(null);
	const flag = $derived(page.url.searchParams.get('coinpay'));
	const messages = {
		connected: '✅ CoinPay connected. CoinPay nodes now use it; unlock your vault for runs so they can.',
		failed: 'CoinPay did not finish connecting. Try again.',
		'needs-vault': 'Create your key vault first (above): the CoinPay token is sealed to it.',
		'linked-elsewhere': 'That CoinPay account is linked to a different MeshHook account.',
		unavailable: 'CoinPay connect is not available on this server right now.'
	};

	onMount(async () => {
		const res = await fetch('/api/secrets');
		if (res.ok) connected = (await res.json()).secrets?.some((s) => s.key === 'COINPAY_CONNECT') ?? false;
	});
</script>

<section class="cp-panel">
	<h2>🪙 CoinPay</h2>
	{#if flag && messages[flag]}<p role="status">{messages[flag]}</p>{/if}
	<p>
		{#if connected}
			Connected as the <code>COINPAY_CONNECT</code> secret. CoinPay nodes take payments, invoices and checkouts with it.
		{:else}
			Connect your CoinPay merchant account so CoinPay nodes can create payments, invoices and checkouts without an API key.
		{/if}
	</p>
	<a class="btn-primary" href="/api/v1/coinpay/oauth/start?intent=connect&next=/secrets">
		{connected ? 'Reconnect CoinPay' : 'Connect CoinPay'}
	</a>
</section>

<style>
	.cp-panel {
		border: 1px solid var(--border-color, #ddd);
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 40rem;
		align-items: flex-start;
	}
	h2 {
		margin: 0;
	}
	p {
		margin: 0;
	}
	a.btn-primary {
		text-decoration: none;
		display: inline-block;
	}
</style>
