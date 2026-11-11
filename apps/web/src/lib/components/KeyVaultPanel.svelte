<script>
	// The key vault is made HERE, in the browser: the passphrase never leaves
	// this page. The server stores only the sealed record and seals secret
	// values to its inbox, which it cannot open.
	import { onMount } from 'svelte';
	import { bytesToBase64, createSealer, wipe } from '@profullstack/sealed-secrets';

	const sealer = createSealer({ app: 'meshhook', scope: 'workflow_secrets' });
	let { userId } = $props();
	let exists = $state(null);
	let pass = $state('');
	let pass2 = $state('');
	let busy = $state(false);
	let note = $state('');
	let recoveryKey = $state('');
	let seal = null;
	let runs = $state({ unlocked: false, expiresAt: null, available: true });
	let unlockPass = $state('');
	let ttl = $state('8h');

	onMount(async () => {
		const res = await fetch('/api/vault');
		if (res.ok) {
			const body = await res.json();
			exists = body.exists;
			seal = body.seal;
		}
		if (exists) refreshRuns();
	});

	async function refreshRuns() {
		const res = await fetch('/api/vault/session');
		const body = await res.json().catch(() => ({}));
		runs = res.ok ? { ...body, available: true } : { unlocked: false, expiresAt: null, available: false, error: body.error };
	}

	// Workflow runs happen while you are away, so they need your vault's data
	// key. It is derived here from the passphrase; only the key is sent, and the
	// runner keeps it in memory until the time you pick (or a restart).
	async function unlockRuns() {
		busy = true;
		note = '';
		let dek = null;
		try {
			if (!seal) seal = (await (await fetch('/api/vault')).json()).seal;
			dek = await sealer.unlockSeal(seal, unlockPass, userId);
			const res = await fetch('/api/vault/session', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ data_key: bytesToBase64(dek), ttl })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error ?? `Unlock failed (${res.status})`);
			runs = { ...body, available: true };
			unlockPass = '';
		} catch (e) {
			note = e.name === 'WrongPassphraseError' ? 'Wrong passphrase.' : e.message;
		} finally {
			wipe(dek);
			busy = false;
		}
	}

	async function lockRuns() {
		await fetch('/api/vault/session', { method: 'DELETE' });
		refreshRuns();
	}

	async function create() {
		if (pass.length < 12) return (note = 'Use at least 12 characters.');
		if (pass !== pass2) return (note = 'The two passphrases differ.');
		busy = true;
		note = '';
		let made = null;
		try {
			made = await sealer.createSeal(pass, userId);
			seal = made.seal;
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

{#if exists && !recoveryKey}
	<section class="vault-panel">
		<h2>Secrets in workflow runs</h2>
		{#if runs.unlocked}
			<p>
				✅ Runs can use your secrets until <strong>{new Date(runs.expiresAt).toLocaleString()}</strong>.
				A server restart locks them again.
			</p>
			<button class="btn-secondary" onclick={lockRuns}>Lock now</button>
		{:else}
			<p>
				🔒 Locked. Steps that use a secret (plugins, <code>{'{{$secrets.NAME}}'}</code>) wait until you unlock.
				Your passphrase stays in this browser; only the derived key goes to the runner's memory.
			</p>
			{#if !runs.available && runs.error}<p role="status">{runs.error}</p>{/if}
			<input type="password" placeholder="Vault passphrase" bind:value={unlockPass} autocomplete="current-password" />
			<label>
				Keep unlocked for
				<select bind:value={ttl}>
					<option value="1h">1 hour</option>
					<option value="8h">8 hours</option>
					<option value="1d">1 day</option>
					<option value="7d">7 days</option>
				</select>
			</label>
			<button class="btn-primary" disabled={busy || !unlockPass} onclick={unlockRuns}>{busy ? 'Working…' : 'Unlock for runs'}</button>
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
