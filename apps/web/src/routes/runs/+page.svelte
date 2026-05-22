<script>
	import RunCard from '$lib/components/RunCard.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let runs = $state(data.runs || []);
	let filterStatus = $state('all');
	let filterWorkflow = $state('all');
	let loading = $state(false);
	let loadingMessage = $state('');

	const filteredRuns = $derived.by(() => {
		let result = runs;

		if (filterStatus !== 'all') {
			result = result.filter((r) => r.status === filterStatus);
		}

		if (filterWorkflow !== 'all') {
			result = result.filter((r) => r.workflow_id === filterWorkflow);
		}

		return result;
	});

	const workflows = $derived(
		Array.from(new Set(runs.map((r) => r.workflow_id))).map((id) => {
			const run = runs.find((r) => r.workflow_id === id);
			return { id, name: run?.workflow?.name || 'Unknown' };
		})
	);

	function handleView(run) {
		goto(`/runs/${run.id}`);
	}

	async function handleRetry(run) {
		try {
			loading = true;
			loadingMessage = 'Retrying run...';
			const response = await fetch(`/api/runs/${run.id}/retry`, {
				method: 'POST'
			});

			if (!response.ok) throw new Error('Failed to retry run');

			const result = await response.json();
			alert(`New run created: ${result.run.id}`);
			goto(`/runs/${result.run.id}`);
		} catch (error) {
			alert(`Error retrying run: ${error.message}`);
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}

	async function handleCancel(run) {
		if (!confirm('Cancel this run?')) return;

		try {
			loading = true;
			loadingMessage = 'Cancelling run...';
			const response = await fetch(`/api/runs/${run.id}/cancel`, {
				method: 'POST'
			});

			if (!response.ok) throw new Error('Failed to cancel run');

			// Update local state
			runs = runs.map((r) => (r.id === run.id ? { ...r, status: 'cancelled' } : r));
		} catch (error) {
			alert(`Error cancelling run: ${error.message}`);
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}
</script>

<svelte:head>
	<title>Runs - MeshHook</title>
</svelte:head>

<div class="runs-page">
	{#if loading}
		<div class="loading-overlay" role="status" aria-live="polite">
			<div class="loading-content">
				<LoadingSpinner size="large" label={loadingMessage} />
				<p class="loading-message">{loadingMessage}</p>
			</div>
		</div>
	{/if}

	<header class="page-header">
		<h1>Workflow Runs</h1>
	</header>

	<div class="runs-content">
		<div class="filters">
			<select bind:value={filterStatus} class="filter-select">
				<option value="all">All Status</option>
				<option value="pending">Pending</option>
				<option value="running">Running</option>
				<option value="completed">Completed</option>
				<option value="failed">Failed</option>
				<option value="cancelled">Cancelled</option>
			</select>

			<select bind:value={filterWorkflow} class="filter-select">
				<option value="all">All Workflows</option>
				{#each workflows as workflow}
					<option value={workflow.id}>{workflow.name}</option>
				{/each}
			</select>
		</div>

		{#if filteredRuns.length === 0}
			<div class="empty-state">
				<p class="empty-icon">🏃</p>
				<p class="empty-text">No runs found</p>
			</div>
		{:else}
			<div class="runs-grid">
				{#each filteredRuns as run (run.id)}
					<RunCard {run} onView={handleView} onRetry={handleRetry} onCancel={handleCancel} />
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.runs-page {
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
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
		color: #333;
	}

	.runs-content {
		padding: 2rem;
	}

	.filters {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
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

	.runs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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
	}
</style>