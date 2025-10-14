<script>
	import { SvelteFlow, Controls, MiniMap, Background, Panel } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import LoopContainerNode from './nodes/LoopContainerNode.svelte';

	// Props
	let { nodes = $bindable([]), edges = $bindable([]), onNodesChange, onEdgesChange, onNodeClick } = $props();

	// State
	let reactFlowWrapper = $state(null);
	let selectedNodeId = $state(null);
	let svelteFlowInstance = $state(null);
	
	// Register custom node types
	const nodeTypes = {
		loopContainer: LoopContainerNode
	};

	// Handle connection creation
	function handleConnect(connection) {
		const newEdge = {
			id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			type: 'smoothstep',
			animated: true
		};
		
		edges = [...edges, newEdge];
		
		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}

	// Handle edge deletion
	function handleEdgesDelete(edgesToDelete) {
		const edgeIdsToDelete = new Set(edgesToDelete.map(e => e.id));
		edges = edges.filter(edge => !edgeIdsToDelete.has(edge.id));
		
		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}

	// Handle node deletion
	function handleNodesDelete(nodesToDelete) {
		const nodeIdsToDelete = new Set(nodesToDelete.map(n => n.id));
		
		// Remove nodes
		nodes = nodes.filter(node => !nodeIdsToDelete.has(node.id));
		
		// Remove edges connected to deleted nodes
		edges = edges.filter(edge =>
			!nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
		);
		
		if (onNodesChange) {
			onNodesChange(nodes);
		}
		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}

	// Handle drag over (required to enable drop)
	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}

	// Handle drop - add new node to canvas
	function handleDrop(event) {
		event.preventDefault();

		// Get the node data from drag event
		const nodeDataStr = event.dataTransfer.getData('application/reactflow');
		if (!nodeDataStr) return;

		try {
			const nodeData = JSON.parse(nodeDataStr);
			
			// Use SvelteFlow instance to convert screen to flow coordinates
			// This accounts for zoom and pan transformations
			let position;
			if (svelteFlowInstance && svelteFlowInstance.screenToFlowPosition) {
				position = svelteFlowInstance.screenToFlowPosition({
					x: event.clientX,
					y: event.clientY
				});
				console.log('Using screenToFlowPosition');
			} else {
				// Fallback to simple calculation if instance not available
				const reactFlowBounds = reactFlowWrapper.getBoundingClientRect();
				position = {
					x: event.clientX - reactFlowBounds.left,
					y: event.clientY - reactFlowBounds.top
				};
				console.log('Using fallback position calculation');
			}
			
			console.log('Screen position:', event.clientX, event.clientY);
			console.log('Flow position:', position);

			// Check if dropping into a loop container
			const targetContainer = findContainerAtPosition(position);
			
			console.log('=== Node Drop ===');
			console.log('Position:', position);
			console.log('Target container:', targetContainer?.id, targetContainer?.data?.label);
			
			// Determine if this should be a container node
			const isLoopNode = nodeData.type === 'loop';
			
			// Create new node with unique ID
			const newNode = {
				id: `${nodeData.type}-${Date.now()}`,
				type: isLoopNode ? 'loopContainer' : 'default',
				// If dropped into container, position is relative to container
				// Otherwise, position is absolute on canvas
				position: targetContainer ? {
					x: position.x - targetContainer.position.x,
					y: position.y - targetContainer.position.y
				} : position,
				// IMPORTANT: Use parentId (not parentNode) for SvelteFlow's parent-child rendering
				...(targetContainer ? {
					parentId: targetContainer.id,  // Correct property name per SvelteFlow docs
					extent: 'parent'  // Constrain movement to parent bounds
				} : {}),
				data: {
					label: nodeData.label,
					type: nodeData.type,
					config: isLoopNode ? { items: '', description: '' } : {},
					// Add container-specific properties for loop nodes
					...(isLoopNode ? {
						isContainer: true,
						childNodes: [],
						dimensions: { width: 600, height: 400 }
					} : {}),
					// Add parent container reference if dropped inside a container
					...(targetContainer ? {
						parentContainer: targetContainer.id
					} : {})
				}
			};
			
			console.log('New node created:', {
				id: newNode.id,
				type: newNode.type,
				parentId: newNode.parentId,
				isContainer: newNode.data.isContainer,
				hasConfig: !!newNode.data.config
			});

			// IMPORTANT: Per SvelteFlow docs, children must appear BEFORE parent in nodes array
			if (targetContainer) {
				console.log('Adding node to container:', targetContainer.id);
				console.log('New node will have parentId:', targetContainer.id);
				
				// Update container's childNodes array
				nodes = nodes.map(n =>
					n.id === targetContainer.id
						? {
							...n,
							data: {
								...n.data,
								childNodes: [...(n.data.childNodes || []), newNode.id]
							}
						}
						: n
				);
				
				console.log('Container childNodes updated:', nodes.find(n => n.id === targetContainer.id)?.data?.childNodes);
				
				// Add child node BEFORE parent in array (SvelteFlow requirement)
				const containerIndex = nodes.findIndex(n => n.id === targetContainer.id);
				nodes = [
					...nodes.slice(0, containerIndex),
					newNode,
					...nodes.slice(containerIndex)
				];
			} else {
				// Add node to the end of the array
				nodes = [...nodes, newNode];
			}
			
			console.log('Node added to canvas:', newNode.id, newNode.type);
			console.log('Total nodes:', nodes.length);
			console.log('==================');

			if (onNodesChange) {
				onNodesChange(nodes);
			}
		} catch (error) {
			console.error('Error adding node:', error);
		}
	}
	
	/**
	 * Find container at a given position
	 * Uses a tolerance margin to account for coordinate conversion issues
	 */
	function findContainerAtPosition(position) {
		console.log('=== findContainerAtPosition ===');
		console.log('Looking for container at position:', position);
		console.log('Total nodes:', nodes.length);
		
		const containers = nodes.filter(n => n.data?.isContainer);
		console.log('Containers found:', containers.length);
		
		// Add tolerance for coordinate conversion issues
		const TOLERANCE = 50;
		
		for (const node of containers) {
			const bounds = {
				x: node.position.x - TOLERANCE,
				y: node.position.y - TOLERANCE,
				width: (node.data.dimensions?.width || 600) + (TOLERANCE * 2),
				height: (node.data.dimensions?.height || 400) + (TOLERANCE * 2)
			};
			
			console.log(`Container ${node.id}:`, bounds);
			console.log('  Position check:', {
				xInRange: position.x >= bounds.x && position.x <= bounds.x + bounds.width,
				yInRange: position.y >= bounds.y && position.y <= bounds.y + bounds.height
			});
			
			if (
				position.x >= bounds.x &&
				position.x <= bounds.x + bounds.width &&
				position.y >= bounds.y &&
				position.y <= bounds.y + bounds.height
			) {
				console.log('✅ Container found:', node.id);
				return node;
			}
		}
		
		console.log('❌ No container found at position');
		console.log('===============================');
		return null;
	}
	
	// Handle node click in the canvas
	function handleCanvasNodeClick(event) {
		// Find the clicked node element
		const nodeElement = event.target.closest('.svelte-flow__node');
		if (!nodeElement) return;
		
		// Get the node ID from the data attribute
		const nodeId = nodeElement.getAttribute('data-id');
		if (!nodeId) return;
		
		// Find the node in our nodes array
		const node = nodes.find(n => n.id === nodeId);
		if (node && onNodeClick) {
			selectedNodeId = nodeId;
			onNodeClick(node);
		}
	}
</script>

<div class="workflow-editor" bind:this={reactFlowWrapper} ondrop={handleDrop} ondragover={handleDragOver} onclick={handleCanvasNodeClick} role="application">
	<SvelteFlow
		bind:this={svelteFlowInstance}
		{nodes}
		{edges}
		{nodeTypes}
		fitView
		onconnect={handleConnect}
		ondelete={(event) => {
			if (event.nodes && event.nodes.length > 0) {
				handleNodesDelete(event.nodes);
			}
			if (event.edges && event.edges.length > 0) {
				handleEdgesDelete(event.edges);
			}
		}}
		defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
	>
		<Background gap={12} size={1} />
		<Controls />
		<MiniMap nodeStrokeWidth={3} zoomable pannable />

		<Panel position="top-left">
			<div class="info-panel">
				<h3>Workflow Editor</h3>
				<p class="hint">Drag nodes from the palette to the canvas</p>
				<p class="hint">Select and press Delete to remove nodes/edges</p>
			</div>
		</Panel>

		<Panel position="top-right">
			<div class="stats-panel">
				<div class="stat">
					<span class="label">Nodes:</span>
					<span class="value">{nodes.length}</span>
				</div>
				<div class="stat">
					<span class="label">Connections:</span>
					<span class="value">{edges.length}</span>
				</div>
			</div>
		</Panel>
	</SvelteFlow>
</div>

<style>
	.workflow-editor {
		width: 100%;
		height: 100%;
		background: #f8f9fa;
	}

	.info-panel {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		min-width: 200px;
	}

	.info-panel h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.info-panel .hint {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
	}

	.stats-panel {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat .label {
		font-size: 0.75rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat .value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
	}

	:global(.svelte-flow__node) {
		background: white;
		border: 2px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		min-width: 150px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s;
	}

	:global(.svelte-flow__node:hover) {
		border-color: #4075a6;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	:global(.svelte-flow__node.selected),
	:global(.svelte-flow__node[data-id].selected) {
		border-color: #ff3e00;
		box-shadow: 0 4px 12px rgba(255, 62, 0, 0.3);
	}
	
	:global(.svelte-flow__node) {
		cursor: pointer;
	}

	:global(.svelte-flow__edge-path) {
		stroke: #4075a6;
		stroke-width: 2;
	}

	:global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
		stroke: #ff3e00;
		stroke-width: 3;
	}

	:global(.svelte-flow__handle) {
		width: 10px;
		height: 10px;
		background: #4075a6;
		border: 2px solid white;
	}

	:global(.svelte-flow__handle:hover) {
		background: #ff3e00;
	}
</style>