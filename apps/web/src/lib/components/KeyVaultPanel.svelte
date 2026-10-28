<script>
	// The key vault is made HERE, in the browser: the passphrase never leaves
	// this page. The server stores only the sealed record and seals secret
	// values to its inbox, which it cannot open.
	import { onMount } from 'svelte';
	import { createSealer, wipe } from '@profullstack/sealed-secrets';

	const sealer = createSealer({ app: 'meshhook', scope: 'workflow_secrets' });
	let { userId } = $props();
	let exists = $state(null);
	let pass = $state('');
	let pass2 = $state('');
	let busy = $state(false);
	let note = $state('');
	let recoveryKey = $state('');

	onMount(async () => {
		const res = await fetch('/api/vault');
		if (res.ok) exists = (await res.json()).exists;
	});

	async function create() {
		if (pass.length < 12) return (note = 'Use at least 12 characters.');
		if (pass !== pass2) return (note = 'The two passphrases differ.');
		busy = true;
		note = '';
		let made = null;
		try {
			made = await sealer.createSeal(pass, userId);
			const res = await fetch('/api/vault', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ seal: made.seal })
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error ?? `Could not save the vault (${res.status})`);
			recoveryKey = made.recoveryKey;
			exists = true;
			pass = '';
			pass2 = '';
		} catch (e) {
			note = e.message;
		} finally {
			wipe(made?.dek);
			busy = false;
		}
	}
</script>

{#if exists === false || recoveryKey}
	<section class="vault-panel">
		<h2>Key vault</h2>
		<p>
			Secret values are sealed with a passphrase only you hold. MeshHook can store them but cannot read them.
			If you lose the passphrase and the recovery key, the values are gone and you enter them again.
		</p>
		{#if recoveryKey}
			<p><strong>Your recovery key, shown once.</strong> Store it somewhere safe.</p>
			<code class="recovery">{recoveryKey}</code>
			<button class="btn-secondary" onclick={() => (recoveryKey = '')}>I saved it</button>
		{:else}
			<input type="password" placeholder="Vault passphrase (12+ characters)" bind:value={pass} autocomplete="new-password" />
			<input type="password" placeholder="Passphrase again" bind:value={pass2} autocomplete="new-password" />
			<button class="btn-primary" disabled={busy} onclick={create}>{busy ? 'Working…' : 'Create key vault'}</button>
		{/if}
		{#if note}<p role="status">{note}</p>{/if}
	</section>
{/if}

<style>
	.vault-panel {
		border: 1px solid var(--border-color, #ddd);
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 40rem;
	}
	.recovery {
		word-break: break-all;
	}
</style>
