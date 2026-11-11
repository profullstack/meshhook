<script>
	/**
	 * Config form for a Profullstack app (plugin) node, generated from its spec
	 * in packages/shared/lib/plugins/catalog.js. Every field takes a literal or a
	 * {{template}} over the previous node's output ({{body.email}},
	 * {{$nodes.<label>.id}}). The API key is never typed here: the node names a
	 * secret, which runs open from your key vault.
	 */
	import { getPlugin, defaultCredential } from '@meshhook/shared/lib/plugins/compile.js';

	let { node, onSave, onCancel, previousNodeOutput = null } = $props();

	const initial = node.data?.config ?? {};
	const plugin = getPlugin(initial.plugin);

	let label = $state(node.data?.label ?? plugin?.name ?? 'App');
	let actionId = $state(initial.action || plugin?.actions?.[0]?.id || '');
	let params = $state({ ...(initial.params ?? {}) });
	let credential = $state(initial.credential ?? (plugin && !plugin.auth?.optional ? defaultCredential(plugin) : ''));
	let baseUrl = $state(initial.baseUrl ?? '');
	let error = $state('');

	const action = $derived(plugin?.actions?.find((a) => a.id === actionId) ?? null);
	const needsKey = $derived(plugin && plugin.auth?.type !== 'none');

	function save() {
		if (!plugin) return onCancel();
		if (plugin.baseUrlEditable && plugin.baseUrlRequired && !baseUrl.trim()) {
			error = 'Set the base URL of your instance';
			return;
		}
		const missing = (action?.params ?? []).filter((p) => p.required && p.default === undefined && !String(params[p.name] ?? '').trim());
		if (missing.length) {
			error = `Required: ${missing.map((p) => p.label ?? p.name).join(', ')}`;
			return;
		}
		// Keep only this action's fields (plus the raw JSON body) so a switched
		// action does not send leftovers.
		const keep = new Set([...(action?.params ?? []).map((p) => p.name), '$body']);
		const clean = Object.fromEntries(Object.entries(params).filter(([k, v]) => keep.has(k) && v !== '' && v != null));
		onSave({
			...node,
			data: { ...node.data, label, config: {
					plugin: plugin.id,
					action: actionId,
					params: clean,
					...(needsKey ? { credential: credential.trim() } : {}),
					...(plugin.baseUrlEditable && baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {})
				}
			}
		});
	}
</script>

<div class="overlay" role="presentation" onclick={(e) => e.target === e.currentTarget && onCancel()}>
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="pl-title">
		<header>
			<h2 id="pl-title">{plugin?.icon ?? '🧩'} {plugin?.name ?? 'Unknown app'}</h2>
			<button class="close" onclick={onCancel} aria-label="Close">&times;</button>
		</header>

		{#if !plugin}
			<p>This node refers to an app meshhook no longer has ({initial.plugin}). Delete it and drag a new one in.</p>
		{:else}
			<p class="hint">{plugin.description} · <a href={plugin.url} target="_blank" rel="noopener">{plugin.url.replace(/^https?:\/\//, '')}</a></p>

			<label for="pl-label">Node label</label>
			<input id="pl-label" type="text" bind:value={label} />

			{#if plugin.baseUrlEditable}
				<label for="pl-base">Base URL of your instance{#if plugin.baseUrlRequired}<span class="req">*</span>{/if}</label>
				<input id="pl-base" type="text" bind:value={baseUrl} placeholder={plugin.baseUrl} />
			{/if}

			<label for="pl-action">Action</label>
			<select id="pl-action" bind:value={actionId}>
				{#each plugin.actions as a}
					<option value={a.id}>{a.label}</option>
				{/each}
			</select>
			{#if action}
				<p class="hint"><code>{action.method} {action.path}</code>{action.description ? ` · ${action.description}` : ''}</p>

				{#each action.params ?? [] as p}
					<label for={`pl-${p.name}`}>
						{p.label ?? p.name}{#if p.required && p.default === undefined}<span class="req">*</span>{/if}
						<span class="type">{p.type ?? 'string'}{p.in && p.in !== 'body' ? ` · ${p.in}` : ''}</span>
					</label>
					{#if p.type === 'json' || p.multiline}
						<textarea id={`pl-${p.name}`} rows="4" bind:value={params[p.name]} placeholder={p.default !== undefined ? String(p.default) : p.example ?? ''}></textarea>
					{:else if p.enum}
						<select id={`pl-${p.name}`} bind:value={params[p.name]}>
							<option value="">{p.default !== undefined ? `default (${p.default})` : '—'}</option>
							{#each p.enum as v}<option value={v}>{v}</option>{/each}
						</select>
					{:else}
						<input id={`pl-${p.name}`} type="text" bind:value={params[p.name]} placeholder={p.default !== undefined ? String(p.default) : p.example ?? ''} />
					{/if}
					{#if p.description}<small class="hint">{p.description}</small>{/if}
				{/each}

				{#if ['POST', 'PUT', 'PATCH'].includes(action.method)}
					<details>
						<summary>Extra JSON body fields</summary>
						<textarea rows="3" bind:value={params.$body} placeholder={'{"field": "{{body.value}}"}'}></textarea>
					</details>
				{/if}
			{/if}

			{#if needsKey}
				<label for="pl-cred">API key secret{#if plugin.auth.optional}<span class="type">optional: reads work without a key</span>{/if}</label>
				<input id="pl-cred" type="text" bind:value={credential} />
				<small class="hint">
					Name of a secret on the <a href="/secrets" target="_blank">Secrets page</a> holding your {plugin.name} key{plugin.auth.hint
						? ` (${plugin.auth.hint})`
						: ''}. Runs need the key vault unlocked for runs.
				</small>
				{#if credential.trim()}
					<a class="connect" href={`/api/v1/logicsrc/grant/start?keys=${encodeURIComponent(credential.trim())}&next=/secrets`} target="_blank" rel="noopener">Get {credential.trim()} from logicsrc →</a>
				{/if}
				{#if plugin.connect}
					<a class="connect" href={plugin.connect} target="_blank" rel="noopener">Connect {plugin.name} →</a>
				{/if}
			{/if}

			{#if previousNodeOutput && Object.keys(previousNodeOutput).length}
				<details>
					<summary>Previous node output (use as {'{{field}}'})</summary>
					<pre>{JSON.stringify(previousNodeOutput, null, 2).slice(0, 4000)}</pre>
				</details>
			{/if}
		{/if}

		{#if error}<p class="error" role="alert">{error}</p>{/if}

		<footer>
			<button class="btn-secondary" onclick={onCancel}>Cancel</button>
			<button class="btn-primary" onclick={save} disabled={!plugin}>Save</button>
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
		gap: 0.4rem;
	}
	header,
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	footer {
		justify-content: flex-end;
		margin-top: 0.75rem;
	}
	h2 {
		margin: 0;
	}
	label {
		margin-top: 0.4rem;
		font-weight: 600;
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
	}
	.type {
		font-weight: 400;
		font-size: 0.75rem;
		opacity: 0.6;
	}
	.req {
		color: #d33;
	}
	.close {
		background: none;
		border: 0;
		font-size: 1.5rem;
		cursor: pointer;
		color: inherit;
	}
	input,
	select,
	textarea {
		padding: 0.5rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: 6px;
		background: var(--bg-secondary, #fff);
		color: inherit;
		font: inherit;
	}
	textarea {
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}
	pre {
		background: var(--bg-secondary, #f5f5f5);
		padding: 0.5rem;
		border-radius: 6px;
		overflow: auto;
		max-height: 12rem;
		font-size: 0.8rem;
	}
	.hint {
		font-size: 0.85rem;
		opacity: 0.8;
		margin: 0;
	}
	.connect {
		font-weight: 600;
		font-size: 0.9rem;
	}
	.error {
		color: #d33;
		margin: 0;
	}
</style>
