<script>
	// "Get keys from logicsrc": logicsrc seals each named key to your key vault
	// and sends it here; it lands as an ordinary secret, rotations included.
	import { page } from '$app/state';

	let keys = $state('COINPAY_API_KEY');
	const flag = $derived(page.url.searchParams.get('logicsrc'));
	const messages = {
		granted: '✅ logicsrc sent the keys. They appear in the list below; rotations in logicsrc update them here.',
		needs_vault: 'Create your key vault first (above): keys from logicsrc are sealed to it.',
		no_keys: 'Name at least one key.',
		too_many: 'At most 20 keys per request.',
		bad_key: 'Key names use letters, digits, _ . and -.'
	};
	const href = $derived(`/api/v1/logicsrc/grant/start?keys=${encodeURIComponent(keys)}&next=/secrets`);
</script>

<section class="ls-panel">
	<h2>🔑 Keys from logicsrc</h2>
	{#if flag && messages[flag]}<p role="status">{messages[flag]}</p>{/if}
	<p>
		Keep API keys in your <a href="https://logicsrc.com" target="_blank" rel="noopener">logicsrc</a> vault instead of pasting them here.
		You approve on logicsrc, your browser seals each key to this vault, and a rotation in logicsrc reaches MeshHook on its own.
	</p>
	<label>
		Key names (comma-separated)
		<input type="text" bind:value={keys} placeholder="COINPAY_API_KEY, SMSHUB_API_KEY" />
	</label>
	<a class="btn-primary" href={href}>Get from logicsrc</a>
</section>

<style>
	.ls-panel {
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
	h2,
	p {
		margin: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
	}
	input {
		padding: 0.5rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 6px;
		background: var(--bg-secondary, #fff);
		color: inherit;
	}
	a.btn-primary {
		text-decoration: none;
	}
</style>
