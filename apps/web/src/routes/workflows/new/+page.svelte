<script>
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodePalette from '$lib/components/NodePalette.svelte';
	import NodeConfigModal from '$lib/components/NodeConfigModal.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Workflow state
	let nodes = $state([]);
	let edges = $state([]);
	let workflowName = $state('Untitled Workflow');
	let saving = $state(false);
	let saveError = $state('');
	
	// Node configuration state
	let selectedNode = $state(null);
	let showConfigModal = $state(false);

	// Handle node changes
	function handleNodesChange(updatedNodes) {
		nodes = updatedNodes;
	}

	// Handle edge changes
	function handleEdgesChange(updatedEdges) {
		edges = updatedEdges;
	}
	
	// Handle node click to open configuration
	function handleNodeClick(node) {
		selectedNode = node;
		showConfigModal = true;
	}
	
	// Handle node configuration save
	function handleNodeConfigSave(updatedNode) {
		nodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
		showConfigModal = false;
		selectedNode = null;
	}
	
	// Handle node configuration cancel
	function handleNodeConfigCancel() {
		showConfigModal = false;
		selectedNode = null;
	}

	// Save workflow
	async function saveWorkflow() {
		if (saving) return;
		
		try {
			saving = true;
			saveError = '';
			
			const response = await fetch('/api/workflows', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: workflowName,
					description: '',
					nodes,
					edges,
					status: 'draft'
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save workflow');
			}

			const result = await response.json();
			
			// Redirect to the workflow edit page
			goto(`/workflows/${result.workflow.id}/edit`);
		} catch (err) {
			saveError = err.message;
			console.error('Error saving workflow:', err);
			alert(`Error saving workflow: ${err.message}`);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Workflows - MeshHook</title>
</svelte:head>

<div class="workflows-page">
	<header class="page-header">
		<div class="header-content">
			<h1>{workflowName}</h1>
			<div class="header-actions">
				<button class="btn-secondary" onclick={() => (workflowName = prompt('Workflow name:', workflowName) || workflowName)}>
					Rename
				</button>
				<button class="btn-primary" onclick={saveWorkflow}>
					Save Workflow
				</button>
			</div>
		</div>
	</header>

	<div class="workflow-container">
		<NodePalette />
		<div class="editor-container">
			<WorkflowEditor
				bind:nodes
				bind:edges
				onNodesChange={handleNodesChange}
				onEdgesChange={handleEdgesChange}
				onNodeClick={handleNodeClick}
			/>
		</div>
	</div>
	
	{#if showConfigModal && selectedNode}
		<NodeConfigModal
			node={selectedNode}
			onSave={handleNodeConfigSave}
			onCancel={handleNodeConfigCancel}
		/>
	{/if}
</div>

<style>
	.workflows-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #f8f9fa;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e0e0e0;
		padding: 1rem 2rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: 100%;
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--color-theme-1);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-theme-2);
	}

	.btn-secondary {
		background: white;
		color: #333;
		border: 1px solid #ddd;
	}

	.btn-secondary:hover {
		background: #f5f5f5;
	}

	.workflow-container {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor-container {
		flex: 1;
		position: relative;
	}
</style>