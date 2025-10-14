<script>
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import NodePalette from '$lib/components/NodePalette.svelte';
	import NodeConfigModal from '$lib/components/NodeConfigModal.svelte';
	import ValidationPanel from '$lib/components/ValidationPanel.svelte';
	import { validateWorkflow } from '$lib/utils/workflow-validator.js';
	import { organizeCanvas } from '$lib/utils/layout-organizer.js';
	import { getChildNodes, getContainerExecutionOrder } from '$lib/utils/container-utils.js';
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
	let selectedNodeId = $state(null);
	let showConfigModal = $state(false);
	let previousNode = $state(null);
	
	// Track execution state to force reactive updates
	let executionCounter = $state(0);
	
	// Get the actual selected node from nodes array (always fresh)
	const selectedNode = $derived(
		selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
	);
	
	// Make previousNodeOutput reactive - updates when nodes, selectedNode, or executionCounter change
	const previousNodeOutput = $derived.by(() => {
		console.log('=== $derived.by previousNodeOutput EVALUATING ===');
		console.log('executionCounter:', executionCounter);
		console.log('selectedNode:', selectedNode?.id, selectedNode?.data?.type);
		console.log('nodes array length:', nodes.length);
		console.log('nodes array reference:', nodes);
		
		const result = selectedNode ? getPreviousNodeOutput(selectedNode, executionCounter) : {};
		
		console.log('$derived.by result:', result);
		console.log('=== $derived.by previousNodeOutput COMPLETE ===');
		return result;
	});

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
	function getPreviousNodeOutput(currentNode, _executionCounter) {
		console.log('getPreviousNodeOutput called for node:', currentNode.id, currentNode.data?.type);
		console.log('Execution counter:', _executionCounter);
		console.log('Node parentId:', currentNode.parentId);
		console.log('Node data.parentContainer:', currentNode.data?.parentContainer);
		
		// Check if this node is inside a loop container
		if (currentNode.parentId || currentNode.data?.parentContainer) {
			const parentId = currentNode.parentId || currentNode.data?.parentContainer;
			const parentContainer = nodes.find(n => n.id === parentId);
			
			console.log('Node is inside container:', parentId);
			console.log('Parent container found:', !!parentContainer);
			console.log('Parent container RAW:', parentContainer);
			console.log('Parent container data RAW:', parentContainer?.data);
			console.log('Parent container data.loopOutput RAW:', parentContainer?.data?.loopOutput);
			
			// Try accessing directly first (without unwrapping)
			const hasLoopOutputDirect = !!parentContainer?.data?.loopOutput;
			console.log('Parent has loopOutput (direct access):', hasLoopOutputDirect);
			
			// Unwrap the Proxy to access the actual data
			const parentData = parentContainer ? JSON.parse(JSON.stringify(parentContainer.data)) : null;
			console.log('Parent container data (unwrapped):', parentData);
			console.log('Parent has loopOutput (unwrapped):', !!parentData?.loopOutput);
			console.log('Parent loopOutput value (unwrapped):', parentData?.loopOutput);
			
			if (parentData && parentData.loopOutput) {
				// Return first item from loop output as example
				const loopOutput = parentData.loopOutput;
				if (Array.isArray(loopOutput) && loopOutput.length > 0) {
					console.log('Returning first loop iteration item as input');
					return loopOutput[0];
				}
			}
			
			// If no loop output yet, return empty
			console.log('No loop output available, returning empty');
			return {};
		}
		
		// Find edges that connect to this node
		const incomingEdges = edges.filter(edge => edge.target === currentNode.id);
		
		// No previous node - return empty object (user must execute workflow)
		if (incomingEdges.length === 0) {
			console.log('No incoming edges, returning empty');
			return {};
		}
		
		// Get the first previous node
		const previousNodeId = incomingEdges[0].source;
		const foundNode = nodes.find(n => n.id === previousNodeId);
		
		// No node found - return empty
		if (!foundNode) {
			console.log('Previous node not found, returning empty');
			return {};
		}
		
		// Clone the found node to avoid immutability issues
		const previousNode = JSON.parse(JSON.stringify(foundNode));
		
		console.log('Previous node:', previousNode.id, previousNode.data?.type);
		console.log('Previous node has testResult?', !!previousNode.data?.testResult);
		
		// If previous node has test result data, use it
		// This shows the OUTPUT of the previous node as INPUT to current node
		if (previousNode.data?.testResult) {
			console.log('Using previous node testResult');
			console.log('testResult is:', Array.isArray(previousNode.data.testResult) ? 'ARRAY' : 'OBJECT');
			return JSON.parse(JSON.stringify(previousNode.data.testResult));
		}
		
		// No test result - return empty (user must execute workflow)
		console.log('No testResult, returning empty');
		return {};
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
		// previousNodeOutput will update automatically via $derived
	}
	
	// Handle executing workflow up to a specific node
	async function handleExecuteWorkflow(targetNodeId) {
		console.log('=== handleExecuteWorkflow START ===');
		console.log('Target node ID:', targetNodeId);
		
		try {
			// Find the target node
			const targetNode = nodes.find(n => n.id === targetNodeId);
			if (!targetNode) {
				return { success: false, error: 'Target node not found' };
			}
			
			console.log('Target node:', targetNode.data?.type, targetNode.data?.label);
			console.log('Target node parentId:', targetNode.parentId);
			
			// Check if this is a child node inside a loop container
			if (targetNode.parentId || targetNode.data?.parentContainer) {
				const parentId = targetNode.parentId || targetNode.data?.parentContainer;
				const parentContainer = nodes.find(n => n.id === parentId);
				
				console.log('Target is inside container:', parentId);
				console.log('Parent container has loopOutput:', !!parentContainer?.data?.loopOutput);
				
				// If parent has loopOutput, just execute this child node with first item as input
				if (parentContainer && parentContainer.data?.loopOutput) {
					const loopOutput = parentContainer.data.loopOutput;
					if (Array.isArray(loopOutput) && loopOutput.length > 0) {
						console.log('Executing child node with first loop item as input');
						const firstItem = loopOutput[0];
						
						// Execute just this child node
						// For now, just pass through the input (webhook nodes don't execute in test mode)
						console.log('Child node execution complete (pass-through)');
						return { success: true, output: firstItem };
					}
				}
				
				// If no loopOutput, we need to execute the parent loop first
				console.log('No loopOutput yet, need to execute parent loop first');
				console.log('Will execute parent loop node:', parentId);
				
				// Change target to parent loop and execute it
				const result = await handleExecuteWorkflow(parentId);
				
				// After parent loop executes, the loopOutput should be available
				// Force a re-evaluation by incrementing execution counter
				queueMicrotask(() => {
					executionCounter++;
					console.log('Incremented executionCounter after parent loop execution:', executionCounter);
				});
				
				return result;
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
			
			console.log('Execution path:', executionPath.map(n => `${n.data?.type}(${n.id.slice(0,8)})`).join(' → '));
			
			// Execute nodes in order
			let lastOutput = {};
			
			for (const node of executionPath) {
				console.log(`\n--- Executing: ${node.data?.type} (${node.id.slice(0,8)}) ---`);
				console.log('Input (lastOutput):', lastOutput);
				
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
						console.log('HTTP response received, length:', JSON.stringify(lastOutput).length);
						// Update node with test result
						nodes = nodes.map(n =>
							n.id === node.id
								? { ...n, data: { ...n.data, testResult: lastOutput } }
								: n
						);
						console.log('HTTP node updated with testResult');
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
				} else if (node.data?.type === 'branch') {
					// Branch node - pass through input as-is for now
					console.log('Branch node - passing through input');
					nodes = nodes.map(n =>
						n.id === node.id
							? { ...n, data: { ...n.data, testResult: lastOutput } }
							: n
					);
					console.log('Branch node updated with testResult');
					// lastOutput stays the same (pass-through)
				} else if (node.data?.type === 'loop') {
					console.log('Loop node detected, isContainer:', node.data?.isContainer);
					
					// Check if this is a container loop
					if (node.data?.isContainer) {
						// CONTAINER LOOP EXECUTION
						console.log('Executing loop container');
						
						// Extract array using JMESPath
						const response = await fetch('/api/test-loop', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								config: node.data?.config || {},
								input: lastOutput
							})
						});
						
						const extractResult = await response.json();
						
						if (!extractResult.success) {
							return {
								success: false,
								error: `Failed to extract array in ${node.data?.label || node.id}: ${extractResult.error || 'Unknown error'}`
							};
						}
						
						const arrayItems = extractResult.output;
						console.log('Extracted array with', arrayItems.length, 'items');
						
						// Get child nodes in execution order
						const childNodes = getContainerExecutionOrder(node, nodes, edges);
						console.log('Child nodes to execute:', childNodes.map(n => n.data?.type).join(' → '));
						
						// Execute child nodes for each array item
						const iterationResults = [];
						
						for (let i = 0; i < arrayItems.length; i++) {
							const item = arrayItems[i];
							console.log(`\n=== Loop Iteration ${i + 1}/${arrayItems.length} ===`);
							console.log('Item:', item);
							
							let iterationOutput = item;
							
							// Execute each child node in order
							for (const childNode of childNodes) {
								console.log(`Executing child: ${childNode.data?.type} (${childNode.id.slice(0,8)})`);
								console.log('Child node input:', iterationOutput);
								
								try {
									// Execute based on child node type
									if (childNode.data?.type === 'transform') {
										const childResponse = await fetch('/api/test-transform', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({
												config: childNode.data?.config || {},
												input: iterationOutput
											})
										});
										
										const childResult = await childResponse.json();
										if (childResult.success) {
											iterationOutput = childResult.output;
										} else {
											console.warn(`Child node ${childNode.data?.label} failed:`, childResult.error);
											// Continue with current output (don't fail the loop)
										}
									} else if (childNode.data?.type === 'httpCall') {
										// For HTTP calls inside loop, use the item data for template processing
										const childResponse = await fetch('/api/test-http', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({
												...childNode.data?.config,
												_input: iterationOutput  // Pass input for template processing
											})
										});
										
										const childResult = await childResponse.json();
										if (childResult.success) {
											iterationOutput = childResult.response;
										} else {
											console.warn(`Child node ${childNode.data?.label} failed:`, childResult.error?.message);
											// Continue with current output (don't fail the loop)
										}
									} else if (childNode.data?.type === 'webhook') {
										// For webhook nodes inside loop, execute with item data for template processing
										console.log(`🔔 WEBHOOK EXECUTION #${i + 1} - Loop iteration ${i + 1}/${arrayItems.length}`);
										console.log('Webhook config:', childNode.data?.config);
										console.log('Webhook input (iterationOutput):', iterationOutput);
										console.log('Input type:', Array.isArray(iterationOutput) ? 'ARRAY (BUG!)' : typeof iterationOutput);
										
										const childResponse = await fetch('/api/test-webhook', {
											method: 'POST',
											headers: { 'Content-Type': 'application/json' },
											body: JSON.stringify({
												config: childNode.data?.config || {},
												input: iterationOutput
											})
										});
										
										const childResult = await childResponse.json();
										if (childResult.success) {
											iterationOutput = childResult.response;
											console.log('✅ Webhook executed successfully, output:', iterationOutput);
										} else {
											console.warn(`❌ Child node ${childNode.data?.label} failed:`, childResult.error?.message || childResult.error);
											// Continue with current output (don't fail the loop)
										}
									}
									// Add more node types as needed
								} catch (error) {
									console.error(`Error executing child node ${childNode.data?.label}:`, error);
									// Continue with current output (don't fail the loop)
								}
							}
							
							iterationResults.push(iterationOutput);
							console.log('Iteration result:', iterationOutput);
						}
						
						// Store results
						lastOutput = iterationResults;
						console.log('Loop container complete, total results:', iterationResults.length);
						
						// Update loop node with BOTH testResult and loopOutput
						nodes = nodes.map(n =>
							n.id === node.id
								? {
									...n,
									data: {
										...n.data,
										testResult: lastOutput,
										loopOutput: lastOutput  // Store for child node preview
									}
								}
								: n
						);
						
						console.log('Loop node updated with testResult and loopOutput');
						
						console.log('About to increment execution counter');
						console.log('Current executionCounter:', executionCounter);
						console.log('Nodes array after loop update:', nodes.map(n => ({
							id: n.id.slice(0,8),
							type: n.data?.type,
							hasLoopOutput: !!n.data?.loopOutput,
							loopOutputLength: n.data?.loopOutput?.length
						})));
						
						// Increment execution counter AFTER nodes update completes
						// Use queueMicrotask to ensure Svelte's reactivity has processed the nodes update
						queueMicrotask(() => {
							console.log('queueMicrotask executing - incrementing counter');
							executionCounter++;
							console.log('Execution counter incremented to:', executionCounter);
							console.log('Nodes at counter increment:', nodes.map(n => ({
								id: n.id.slice(0,8),
								hasLoopOutput: !!n.data?.loopOutput
							})));
						});
					} else {
						// LEGACY LOOP (simple array extraction)
						console.log('Executing legacy loop (array extraction only)');
						
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
							const loopInput = lastOutput;
							lastOutput = result.output;
							
							console.log('Loop extracted array, length:', lastOutput.length);
							
							nodes = nodes.map(n =>
								n.id === node.id
									? {
										...n,
										data: {
											...n.data,
											testResult: loopInput,
											loopOutput: lastOutput
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
				}
				// Add more node types as needed
			}
			
			console.log('=== handleExecuteWorkflow COMPLETE ===');
			console.log('Final output:', lastOutput);
			console.log('Nodes after execution:', nodes.map(n => ({
				id: n.id.slice(0,8),
				type: n.data?.type,
				hasTestResult: !!n.data?.testResult
			})));
			
			return { success: true, output: lastOutput };
		} catch (error) {
			console.error('handleExecuteWorkflow error:', error);
			return { success: false, error: error.message };
		}
	}
	
	// Handle node click - open configuration modal
	function handleNodeClick(node) {
		selectedNodeId = node.id;
		// Get previous node
		const prevNode = getPreviousNode(node);
		previousNode = prevNode;
		// selectedNode and previousNodeOutput will be computed automatically via $derived
		showConfigModal = true;
	}
	
	// Handle node configuration save
	function handleNodeConfigSave(updatedNode) {
		// Update the node in the nodes array
		nodes = nodes.map(n =>
			n.id === updatedNode.id ? updatedNode : n
		);
		showConfigModal = false;
		selectedNodeId = null;
		previousNode = null;
		// selectedNode and previousNodeOutput are derived, no need to reset
	}
	
	// Handle modal cancel
	function handleModalCancel() {
		showConfigModal = false;
		selectedNodeId = null;
		previousNode = null;
		// selectedNode and previousNodeOutput are derived, no need to reset
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
			{previousNodeOutput}
			{previousNode}
			onRefreshPreviousNode={handleRefreshPreviousNode}
			onExecuteWorkflow={handleExecuteWorkflow}
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