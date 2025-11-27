<script>
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodePalette from '$lib/components/NodePalette.svelte';
	import NodeConfigModal from '$lib/components/NodeConfigModal.svelte';
	import { goto } from '$app/navigation';
	import { trackWorkflowCreated, trackWorkflowSaved, trackWorkflowExecuted, trackNodeAdded, trackError } from '$lib/utils/analytics.js';

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
		// Clone the node to avoid immutability issues
		selectedNode = JSON.parse(JSON.stringify(node));
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
	
	// Handle executing workflow up to a specific node
	async function handleExecuteWorkflow(targetNodeId) {
		try {
			// Find the target node
			const targetNode = nodes.find(n => n.id === targetNodeId);
			if (!targetNode) {
				return { success: false, error: 'Target node not found' };
			}
			
			// Build execution path by traversing backwards from target node
			const executionPath = [];
			const visited = new Set();
			
			function buildPath(nodeId) {
				if (visited.has(nodeId)) return;
				visited.add(nodeId);
				
				const node = nodes.find(n => n.id === nodeId);
				if (!node) return;
				
				// Find incoming edges
				const incomingEdges = edges.filter(e => e.target === nodeId);
				
				// Process dependencies first
				for (const edge of incomingEdges) {
					buildPath(edge.source);
				}
				
				// Add current node to path
				executionPath.push(node);
			}
			
			buildPath(targetNodeId);
			
			// Execute nodes in order
			let lastOutput = {};
			
			for (const node of executionPath) {
				if (node.data?.type === 'httpCall') {
					// Execute HTTP call
					const response = await fetch('/api/test-http', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(node.data?.config || {})
					});
					
					const result = await response.json();
					
					if (result.success) {
						lastOutput = result.response;
						// Update node with test result
						nodes = nodes.map(n =>
							n.id === node.id
								? { ...n, data: { ...n.data, testResult: lastOutput } }
								: n
						);
					} else {
						return {
							success: false,
							error: `Failed to execute ${node.data?.label || node.id}: ${result.error?.message || 'Unknown error'}`
						};
					}
				} else if (node.data?.type === 'transform') {
					// Execute transform node
					const response = await fetch('/api/test-transform', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							config: node.data?.config || {},
							input: lastOutput
						})
					});
					
					const result = await response.json();
					
					if (result.success) {
						lastOutput = result.output;
						// Update node with test result
						nodes = nodes.map(n =>
							n.id === node.id
								? { ...n, data: { ...n.data, testResult: lastOutput } }
								: n
						);
					} else {
						return {
							success: false,
							error: `Failed to execute ${node.data?.label || node.id}: ${result.error || 'Unknown error'}`
						};
					}
				} else if (node.data?.type === 'loop') {
					// Execute loop node - extract array using JMESPath
					const response = await fetch('/api/test-loop', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							config: node.data?.config || {},
							input: lastOutput
						})
					});
					
					const result = await response.json();
					
					if (result.success) {
						// Store the original input AND the extracted output separately
						const loopInput = lastOutput;
						lastOutput = result.output;
						
						// Update node with BOTH input and output for proper display
						nodes = nodes.map(n =>
							n.id === node.id
								? {
									...n,
									data: {
										...n.data,
										testResult: lastOutput,
										loopInput: loopInput  // Store original input separately
									}
								}
								: n
						);
					} else {
						return {
							success: false,
							error: `Failed to execute ${node.data?.label || node.id}: ${result.error || 'Unknown error'}`
						};
					}
				}
				// Add more node types as needed
			}
			
			return { success: true, output: lastOutput };
		} catch (error) {
			return { success: false, error: error.message };
		}
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
			
			// Track workflow creation
			trackWorkflowCreated({
				id: result.workflow.id,
				name: workflowName,
				nodeCount: nodes.length
			});
			
			// Redirect to the workflow edit page
			goto(`/workflows/${result.workflow.id}/edit`);
		} catch (err) {
			saveError = err.message;
			console.error('Error saving workflow:', err);
			// Track error
			trackError({ message: err.message, context: 'workflow_save' });
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
			onExecuteWorkflow={handleExecuteWorkflow}
			onSave={handleNodeConfigSave}
			onCancel={handleNodeConfigCancel}
		/>
	{/if}
</div>

<style>
	.workflows-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 64px);
		background-color: var(--color-bg-secondary);
	}

	.page-header {
		background-color: var(--color-nav-bg);
		border-bottom: 1px solid var(--color-nav-border);
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
		color: var(--color-text-primary);
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-primary {
		background-color: var(--color-button-primary);
		color: var(--color-text-inverse);
	}

	.btn-primary:hover {
		background-color: var(--color-button-primary-hover);
	}

	.btn-secondary {
		background-color: var(--color-card-bg);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
	}

	.btn-secondary:hover {
		background-color: var(--color-bg-hover);
	}

	.workflow-container {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.editor-container {
		flex: 1;
		position: relative;
		background-color: var(--color-bg-tertiary);
	}
</style>