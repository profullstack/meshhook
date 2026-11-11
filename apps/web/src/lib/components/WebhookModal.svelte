<script>
	/**
	 * Webhook trigger. A webhook node STARTS a run: POSTing to its URL creates
	 * a run whose input is { headers, query, body }. (This modal used to ask for
	 * an outgoing URL the engine never read; use HTTP Call to send a request.)
	 */
	import { page } from '$app/state';

	let { node, onSave, onCancel } = $props();

	let label = $state(node.data?.label ?? 'Webhook');
	let copied = $state('');

	const workflow = $derived(page.data?.workflow ?? null);
	const origin = $derived(page.url?.origin ?? 'https://meshhook.com');
	const hookUrl = $derived(workflow?.project_id && workflow?.slug ? `${origin}/api/hooks/${workflow.project_id}/${workflow.slug}` : null);
	const curl = $derived(
		hookUrl ? `curl -X POST ${hookUrl} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"hello":"world"}'` : ''
	);

	async function copy(text, what) {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			setTimeout(() => (copied = ''), 1500);
		} catch {
			copied = '';
		}
	}

	function save() {
		onSave({ ...node, data: { ...node.data, label, config: { ...(node.data?.config ?? {}) } } });
	}
</script>

<div class="overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && onCancel()}>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="wh-title">
		<header>
			<h2 id="wh-title">🔗 Webhook trigger</h2>
			<button class="close" onclick={onCancel} aria-label="Close">&times;</button>
		</header>

		<label for="wh-label">Node label</label>
		<input id="wh-label" type="text" bind:value={label} />

		<h3>Trigger URL</h3>
		{#if hookUrl}
			<div class="row">
				<code class="url">{hookUrl}</code>
				<button class="btn-secondary" onclick={() => copy(hookUrl, 'url')}>{copied === 'url' ? 'Copied' : 'Copy'}</button>
			</div>
			<p class="hint">
				POST anything to it. The next node receives <code>{'{ headers, query, body }'}</code>; JSON bodies arrive parsed,
				so <code>{'{{body.hello}}'}</code> works in templates. The published version runs; until you publish, the latest
				draft does.
			</p>
			<pre>{curl}</pre>
			<button class="btn-secondary" onclick={() => copy(curl.replace(/\\\n\s*/g, ''), 'curl')}>{copied === 'curl' ? 'Copied' : 'Copy curl'}</button>
		{:else}
			<p class="hint">Save the workflow first; its trigger URL appears here.</p>
		{/if}

		<footer>
			<button class="btn-secondary" onclick={onCancel}>Cancel</button>
			<button class="btn-primary" onclick={save}>Save</button>
		</footer>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.5);
		display: grid;
		place-items: center;
		z-index: 1000;
		padding: 16px;
	}
	.modal {
		background: var(--bg-primary, #fff);
		color: var(--text-primary, #111);
		border-radius: 10px;
		padding: 1.25rem;
		width: min(40rem, 100%);
		max-height: 90vh;
		overflow: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	header,
	footer,
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	footer {
		justify-content: flex-end;
		margin-top: 0.75rem;
	}
	h2,
	h3 {
		margin: 0;
	}
	h3 {
		margin-top: 0.75rem;
		font-size: 1rem;
	}
	.close {
		background: none;
		border: 0;
		font-size: 1.5rem;
		cursor: pointer;
		color: inherit;
	}
	input {
		padding: 0.5rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 6px;
		background: var(--bg-secondary, #fff);
		color: inherit;
	}
	.url {
		word-break: break-all;
		flex: 1;
	}
	pre {
		background: var(--bg-secondary, #f5f5f5);
		padding: 0.75rem;
		border-radius: 6px;
		overflow-x: auto;
		font-size: 0.85rem;
		margin: 0;
	}
	.hint {
		font-size: 0.9rem;
		opacity: 0.8;
		margin: 0;
	}
</style>
