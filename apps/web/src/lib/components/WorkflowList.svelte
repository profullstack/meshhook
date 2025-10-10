<script>
	import WorkflowCard from './WorkflowCard.svelte';
	import { goto } from '$app/navigation';

	let { workflows = [], onDelete, onDuplicate } = $props();

	let searchQuery = $state('');
	let sortBy = $state('updated_at');
	let filterStatus = $state('all');

	// Filtered and sorted workflows
	const filtered = $derived.by(() => {
		let result = workflows;

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(w) =>
					w.name.toLowerCase().includes(query) ||
					w.description?.toLowerCase().includes(query)
			);
		}

		// Filter by status
		if (filterStatus !== 'all') {
			result = result.filter((w) => w.status === filterStatus);
		}

		// Sort
		result = [...result].sort((a, b) => {
			if (sortBy === 'name') {
				return a.name.localeCompare(b.name);
			} else if (sortBy === 'created_at') {
				return new Date(b.created_at) - new Date(a.created_at);
			} else {
				// updated_at
				return new Date(b.updated_at) - new Date(a.updated_at);
			}
		});

		return result;
	});

	function handleEdit(workflow) {
		goto(`/workflows/${workflow.id}/edit`);
	}

	function handleDelete(workflow) {
		onDelete?.(workflow);
	}

	function handleDuplicate(workflow) {
		onDuplicate?.(workflow);
	}
</script>

<div class="workflow-list">
	<div class="list-controls">
		<div class="search-box">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search workflows..."
				class="search-input"
			/>
		</div>

		<div class="filters">
			<select bind:value={filterStatus} class="filter-select">
				<option value="all">All Status</option>
				<option value="draft">Draft</option>
				<option value="published">Published</option>
			</select>

			<select bind:value={sortBy} class="filter-select">
				<option value="updated_at">Recently Updated</option>
				<option value="created_at">Recently Created</option>
				<option value="name">Name (A-Z)</option>
			</select>
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="empty-state">
			<p class="empty-icon">📋</p>
			<p class="empty-text">
				{searchQuery || filterStatus !== 'all' ? 'No workflows match your filters' : 'No workflows yet'}
			</p>
			{#if !searchQuery && filterStatus === 'all'}
				<a href="/workflows/new" class="btn-primary">Create Your First Workflow</a>
			{/if}
		</div>
	{:else}
		<div class="workflows-grid">
			{#each filtered as workflow (workflow.id)}
				<WorkflowCard
					{workflow}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onDuplicate={handleDuplicate}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.workflow-list {
		padding: 2rem;
	}

	.list-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.search-box {
		flex: 1;
		min-width: 250px;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #4075a6;
	}

	.filters {
		display: flex;
		gap: 0.75rem;
	}

	.filter-select {
		padding: 0.75rem 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		background: white;
		cursor: pointer;
	}

	.filter-select:focus {
		outline: none;
		border-color: #4075a6;
	}

	.workflows-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
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

	.btn-primary {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: var(--color-theme-1);
		color: white;
		border-radius: 4px;
		text-decoration: none;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: var(--color-theme-2);
	}
</style>