<script>
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodePalette from '$lib/components/NodePalette.svelte';
	import NodeConfigModal from '$lib/components/NodeConfigModal.svelte';
	import ValidationPanel from '$lib/components/ValidationPanel.svelte';
	import { validateWorkflow } from '$lib/utils/workflow-validator.js';
	import { organizeCanvas } from '$lib/utils/layout-organizer.js';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Workflow state
	let nodes = $state(data.workflow?.definition?.nodes || []);
	let edges = $state(data.workflow?.definition?.edges || []);
	let workflowName = $state(data.workflow?.name || 'Untitled Workflow');
	let workflowDescription = $state(data.workflow?.description || '');
	let workflowStatus = $state(data.workflow?.status || 'draft');

	let saving = $state(false);
	let validationErrors = $state([]);
	
	// Node configuration modal state
	let selectedNode = $state(null);
	let showConfigModal = $state(false);

	// Validate on changes
	$effect(() => {
		const result = validateWorkflow({ nodes, edges });
		validationErrors = result.errors;
	});

	// Handle node changes
	function handleNodesChange(updatedNodes) {
		nodes = updatedNodes;
	}

	// Handle edge changes
	function handleEdgesChange(updatedEdges) {
		edges = updatedEdges;
	}
	
	// Get previous node output for template preview
	function getPreviousNodeOutput(node) {
		// Find edges that connect to this node
		const incomingEdges = edges.filter(edge => edge.target === node.id);
		
		let sampleData;
		const currentTimestamp = new Date().toISOString();
		
		if (incomingEdges.length === 0) {
			// No previous node - provide sample data
			sampleData = {
				status: 'success',
				data: {
					user: { name: 'John Doe', email: 'john@example.com' },
					order: { id: 12345, total: 99.99 },
					items: [
						{ name: 'Product A', price: 29.99 },
						{ name: 'Product B', price: 69.99 }
					]
				},
				timestamp: currentTimestamp
			};
		} else {
			// Get the first previous node (for now, we'll support single input)
			const previousNodeId = incomingEdges[0].source;
			const foundNode = nodes.find(n => n.id === previousNodeId);
			
			// Clone to avoid immutability issues
			const previousNode = foundNode ? JSON.parse(JSON.stringify(foundNode)) : null;
			
			// If previous node has test result data, use it
			if (previousNode?.data?.testResult) {
				sampleData = previousNode.data.testResult;
			} else if (previousNode?.data?.type === 'httpCall') {
				// Otherwise provide sample data based on node type
				sampleData = {
					status: 200,
					statusText: 'OK',
					ok: true,
					headers: {
						'content-type': 'application/json'
					},
					data: {
						user: { name: 'Alice Smith', email: 'alice@example.com' },
						order: { id: 67890, status: 'shipped', total: 149.99 },
						items: [
							{ id: 1, name: 'Widget', price: 49.99, quantity: 2 },
							{ id: 2, name: 'Gadget', price: 99.99, quantity: 1 }
						]
					}
				};
			} else {
				// Default sample data
				sampleData = {
					message: 'Sample data from previous node',
					data: {
						value: 42,
						text: 'Hello World',
						nested: { property: 'value' }
					}
				};
			}
		}
		
		// Return a deep clone to ensure mutability
		return JSON.parse(JSON.stringify(sampleData));
	}
	
	// Get the previous node for a given node (returns a plain object copy)
	function getPreviousNode(node) {
		const incomingEdges = edges.filter(edge => edge.target === node.id);
		if (incomingEdges.length === 0) return null;
		
		const previousNodeId = incomingEdges[0].source;
		const foundNode = nodes.find(n => n.id === previousNodeId);
		
		// Return a deep clone to avoid immutability issues
		return foundNode ? JSON.parse(JSON.stringify(foundNode)) : null;
	}
	
	// Handle refreshing previous node data
	function handleRefreshPreviousNode(nodeId, freshData) {
		// Update the node with the fresh test result
		nodes = nodes.map(n =>
			n.id === nodeId
				? { ...n, data: { ...n.data, testResult: freshData } }
				: n
		);
	}
	
	// Handle node click - open configuration modal
	function handleNodeClick(node) {
		// Clone the node to avoid immutability issues
		selectedNode = JSON.parse(JSON.stringify(node));
		showConfigModal = true;
	}
	
	// Handle node configuration save
	function handleNodeConfigSave(updatedNode) {
		// Update the node in the nodes array
		nodes = nodes.map(n =>
			n.id === updatedNode.id ? updatedNode : n
		);
		showConfigModal = false;
		selectedNode = null;
	}
	
	// Handle modal cancel
	function handleModalCancel() {
		showConfigModal = false;
		selectedNode = null;
	}

	// Save workflow
	async function saveWorkflow(publish = false) {
		try {
			saving = true;

			// Validate before saving
			const validation = validateWorkflow({ nodes, edges });
			if (!validation.isValid && publish) {
				alert('Cannot publish workflow with validation errors');
				return;
			}

			const response = await fetch(`/api/workflows/${data.workflow.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: workflowName,
					description: workflowDescription,
					nodes,
					edges,
					status: publish ? 'published' : 'draft'
				})
			});

			if (!response.ok) {
				throw new Error('Failed to save workflow');
			}

			workflowStatus = publish ? 'published' : 'draft';
			alert(publish ? 'Workflow published!' : 'Workflow saved as draft');
		} catch (error) {
			alert(`Error saving workflow: ${error.message}`);
		} finally {
			saving = false;
		}
	}

	function handlePublish() {
		if (confirm('Publish this workflow? Published workflows are immutable.')) {
			saveWorkflow(true);
		}
	}

	// Handle organize canvas
	function handleOrganizeCanvas() {
		if (nodes.length === 0) {
			alert('No nodes to organize');
			return;
		}

		try {
			console.log('Organizing canvas with', nodes.length, 'nodes and', edges.length, 'edges');
			
			// Organize the nodes using the layout algorithm
			// This returns new node objects with updated positions
			const organizedNodes = organizeCanvas(nodes, edges);
			
			console.log('Canvas organized successfully. Sample positions:',
				organizedNodes.slice(0, 3).map(n => ({ id: n.id, x: n.position.x, y: n.position.y }))
			);
			
			// Update nodes - this triggers Svelte reactivity
			nodes = organizedNodes;
		} catch (error) {
			console.error('Error organizing canvas:', error);
			alert('Failed to organize canvas');
		}
	}
</script>

<svelte:head>
	<title>Edit {workflowName} - MeshHook</title>
</svelte:head>

<div class="workflows-page">
	<header class="page-header">
		<div class="header-content">
			<div class="header-left">
				<button class="btn-back" onclick={() => goto('/workflows')}>← Back</button>
				<div class="workflow-info">
					<input
						type="text"
						bind:value={workflowName}
						class="workflow-name-input"
						placeholder="Workflow name"
					/>
					<span class="status-badge" class:published={workflowStatus === 'published'}>
						{workflowStatus}
					</span>
				</div>
			</div>
			<div class="header-actions">
				<button
					class="btn-organize"
					onclick={handleOrganizeCanvas}
					disabled={nodes.length === 0}
					title="Auto-organize nodes in a hierarchical layout"
				>
					🎯 Organize Canvas
				</button>
				<button class="btn-secondary" onclick={() => saveWorkflow(false)} disabled={saving}>
					{saving ? 'Saving...' : 'Save Draft'}
				</button>
				{#if workflowStatus === 'draft'}
					<button
						class="btn-primary"
						onclick={handlePublish}
						disabled={saving || validationErrors.length > 0}
					>
						Publish
					</button>
				{/if}
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

	<ValidationPanel errors={validationErrors} />
	
	{#if showConfigModal && selectedNode}
		<NodeConfigModal
			node={selectedNode}
			previousNodeOutput={getPreviousNodeOutput(selectedNode)}
			previousNode={getPreviousNode(selectedNode)}
			onRefreshPreviousNode={handleRefreshPreviousNode}
			onSave={handleNodeConfigSave}
			onCancel={handleModalCancel}
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

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.btn-back {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-back:hover {
		background: #f5f5f5;
	}

	.workflow-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex: 1;
	}

	.workflow-name-input {
		border: none;
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: background 0.2s;
	}

	.workflow-name-input:hover {
		background: #f5f5f5;
	}

	.workflow-name-input:focus {
		outline: none;
		background: #f5f5f5;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
		background: #fbbf24;
	}

	.status-badge.published {
		background: #10b981;
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

	.btn-primary:hover:not(:disabled) {
		background: var(--color-theme-2);
	}

	.btn-secondary {
		background: white;
		color: #333;
		border: 1px solid #ddd;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f5f5f5;
	}

	.btn-organize {
		background: #8b5cf6;
		color: white;
		border: none;
	}

	.btn-organize:hover:not(:disabled) {
		background: #7c3aed;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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