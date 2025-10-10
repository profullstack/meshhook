<script>
	import WorkflowList from '$lib/components/WorkflowList.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let workflows = $state(data.workflows || []);
	let loading = $state(false);
	let error = $state('');

	async function handleDelete(workflow) {
		try {
			loading = true;
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
		}
	}

	async function handleDuplicate(workflow) {
		try {
			loading = true;
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
		}
	}
</script>

<svelte:head>
	<title>Workflows - MeshHook</title>
</svelte:head>

<div class="workflows-page">
	<header class="page-header">
		<h1>Workflows</h1>
		<a href="/workflows/new" class="btn-primary">Create Workflow</a>
	</header>

	<WorkflowList {workflows} onDelete={handleDelete} onDuplicate={handleDuplicate} />
</div>

<style>
	.workflows-page {
		min-height: 100vh;
		background: #f8f9fa;
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