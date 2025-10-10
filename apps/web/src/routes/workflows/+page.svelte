<script>
	import WorkflowList from '$lib/components/WorkflowList.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let workflows = $state(data.workflows || []);
	let loading = $state(false);
	let loadingMessage = $state('');
	let error = $state('');

	async function handleDelete(workflow) {
		try {
			loading = true;
			loadingMessage = 'Deleting workflow...';
			const response = await fetch(`/api/workflows/${workflow.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete workflow');
			}

			// Remove from list
			workflows = workflows.filter((w) => w.id !== workflow.id);
		} catch (err) {
			error = err.message;
			alert(`Error deleting workflow: ${err.message}`);
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}

	async function handleDuplicate(workflow) {
		try {
			loading = true;
			loadingMessage = 'Duplicating workflow...';
			const response = await fetch('/api/workflows', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: `${workflow.name} (Copy)`,
					description: workflow.description,
					nodes: workflow.definition.nodes,
					edges: workflow.definition.edges,
					status: 'draft'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to duplicate workflow');
			}

			const result = await response.json();
			workflows = [result.workflow, ...workflows];
		} catch (err) {
			error = err.message;
			alert(`Error duplicating workflow: ${err.message}`);
		} finally {
			loading = false;
			loadingMessage = '';
		}
	}
</script>

<svelte:head>
	<title>Workflows - MeshHook</title>
</svelte:head>

<div class="workflows-page">
	{#if loading}
		<div class="loading-overlay" role="status" aria-live="polite">
			<div class="loading-content">
				<LoadingSpinner size="large" label={loadingMessage} />
				<p class="loading-message">{loadingMessage}</p>
			</div>
		</div>
	{/if}

	<header class="page-header">
		<h1>Workflows</h1>
		<a href="/workflows/new" class="btn-primary">Create Workflow</a>
	</header>

	<WorkflowList {workflows} onDelete={handleDelete} onDuplicate={handleDuplicate} />
</div>

<style>
	.workflows-page {
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
		border-radius: 4px;
		text-decoration: none;
		font-weight: 500;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: var(--color-theme-2);
	}
</style>