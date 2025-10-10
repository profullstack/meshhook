<script>
	import SecretModal from '$lib/components/SecretModal.svelte';
	import MaskedInput from '$lib/components/MaskedInput.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let { data } = $props();

	let secrets = $state(data.secrets || []);
	let projects = $state(data.projects || []);
	let searchQuery = $state('');
	let filterProject = $state('all');
	let loading = $state(false);
	let loadingMessage = $state('');

	let modalOpen = $state(false);
	let editingSecret = $state(null);

	const filteredSecrets = $derived(() => {
		let result = secrets;

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter((s) => s.name.toLowerCase().includes(query));
		}

		if (filterProject !== 'all') {
			result = result.filter((s) => s.project_id === filterProject);
		}

		return result;
	});

	const filtered = filteredSecrets();

	function handleCreate() {
		editingSecret = null;
		modalOpen = true;
	}

	function handleEdit(secret) {
		editingSecret = secret;
		modalOpen = true;
	}

	async function handleSave(formData) {
		try {
			const url = editingSecret ? `/api/secrets/${editingSecret.id}` : '/api/secrets';
			const method = editingSecret ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!response.ok) throw new Error('Failed to save secret');

			const result = await response.json();

			if (editingSecret) {
				secrets = secrets.map((s) => (s.id === editingSecret.id ? result.secret : s));
			} else {
				secrets = [result.secret, ...secrets];
			}
		} catch (error) {
			throw error;
		}
	}

	async function handleDelete(secret) {
		if (!confirm(`Delete secret "${secret.name}"? This cannot be undone.`)) return;

		try {
			loading = true;
			loadingMessage = 'Deleting secret...';
			const response = await fetch(`/api/secrets/${secret.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Failed to delete secret');

			secrets = secrets.filter((s) => s.id !== secret.id);
		} catch (error) {
			alert(`Error deleting secret: ${error.message}`);
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Secrets - MeshHook</title>
</svelte:head>

<div class="secrets-page">
	{#if loading}
		<div class="loading-overlay" role="status" aria-live="polite">
			<div class="loading-content">
				<LoadingSpinner size="large" label={loadingMessage} />
				<p class="loading-message">{loadingMessage}</p>
			</div>
		</div>
	{/if}

	<header class="page-header">
		<h1>Secrets Vault</h1>
		<button class="btn-primary" onclick={handleCreate}>Create Secret</button>
	</header>

	<div class="secrets-content">
		<div class="controls">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search secrets..."
				class="search-input"
			/>

			<select bind:value={filterProject} class="filter-select">
				<option value="all">All Projects</option>
				{#each projects as project}
					<option value={project.id}>{project.name}</option>
				{/each}
			</select>
		</div>

		{#if filtered.length === 0}
			<div class="empty-state">
				<p class="empty-icon">🔐</p>
				<p class="empty-text">
					{searchQuery || filterProject !== 'all' ? 'No secrets match your filters' : 'No secrets yet'}
				</p>
				{#if !searchQuery && filterProject === 'all'}
					<button class="btn-primary" onclick={handleCreate}>Create Your First Secret</button>
				{/if}
			</div>
		{:else}
			<div class="secrets-table">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Project</th>
							<th>Value</th>
							<th>Created</th>
							<th>Last Used</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filtered as secret (secret.id)}
							<tr>
								<td class="secret-name">{secret.name}</td>
								<td>{secret.project?.name || 'Unknown'}</td>
								<td class="secret-value">
									<MaskedInput value={secret.value || '••••••••'} readonly />
								</td>
								<td>{formatDate(secret.created_at)}</td>
								<td>{secret.last_used_at ? formatDate(secret.last_used_at) : 'Never'}</td>
								<td class="actions">
									<button class="btn-action" onclick={() => handleEdit(secret)}>Edit</button>
									<button class="btn-action btn-danger" onclick={() => handleDelete(secret)}>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<SecretModal bind:isOpen={modalOpen} secret={editingSecret} {projects} onSave={handleSave} />
</div>

<style>
	.secrets-page {
		position: relative;
		min-height: 100vh;
		background: #f8f9fa;
	}

	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.loading-content {
		background: white;
		padding: 2rem 3rem;
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
	}

	.loading-message {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: #333;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e0e0e0;
		padding: 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
		color: #333;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: var(--color-theme-1);
		color: white;
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: var(--color-theme-2);
	}

	.secrets-content {
		padding: 2rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.search-input,
	.filter-select {
		padding: 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input {
		flex: 1;
		min-width: 250px;
	}

	.search-input:focus,
	.filter-select:focus {
		outline: none;
		border-color: #4075a6;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 8px;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-text {
		font-size: 1.125rem;
		color: #666;
		margin-bottom: 2rem;
	}

	.secrets-table {
		background: white;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid #e0e0e0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		background: #f8f9fa;
	}

	th {
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.875rem;
		color: #333;
		border-bottom: 1px solid #e0e0e0;
	}

	td {
		padding: 1rem;
		font-size: 0.875rem;
		color: #333;
		border-bottom: 1px solid #f0f0f0;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background: #f8f9fa;
	}

	.secret-name {
		font-weight: 600;
		font-family: monospace;
	}

	.secret-value {
		min-width: 200px;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-action {
		padding: 0.375rem 0.75rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-action:hover {
		background: #f5f5f5;
		border-color: #4075a6;
	}

	.btn-danger:hover {
		background: #fee;
		border-color: #ef4444;
		color: #ef4444;
	}
</style>