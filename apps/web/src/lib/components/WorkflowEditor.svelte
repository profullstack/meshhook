<script>
	import { SvelteFlow, Controls, MiniMap, Background, Panel } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	// Props
	let { nodes = $bindable([]), edges = $bindable([]), onNodesChange, onEdgesChange } = $props();

	// State
	let reactFlowWrapper = $state(null);

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
			
			// Get the bounds of the react flow wrapper
			const reactFlowBounds = reactFlowWrapper.getBoundingClientRect();
			
			// Calculate position relative to the wrapper
			// Simple conversion without zoom/pan for now
			const position = {
				x: event.clientX - reactFlowBounds.left,
				y: event.clientY - reactFlowBounds.top
			};

			// Create new node with unique ID
			const newNode = {
				id: `${nodeData.type}-${Date.now()}`,
				type: 'default',
				position,
				data: {
					label: nodeData.label,
					type: nodeData.type,
					config: {}
				}
			};

			// Add node to the canvas
			nodes = [...nodes, newNode];

			if (onNodesChange) {
				onNodesChange(nodes);
			}
		} catch (error) {
			console.error('Error adding node:', error);
		}
	}
</script>

<div class="workflow-editor" bind:this={reactFlowWrapper} ondrop={handleDrop} ondragover={handleDragOver} role="application">
	<SvelteFlow
		{nodes}
		{edges}
		fitView
		defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
	>
		<Background gap={12} size={1} />
		<Controls />
		<MiniMap nodeStrokeWidth={3} zoomable pannable />

		<Panel position="top-left">
			<div class="info-panel">
				<h3>Workflow Editor</h3>
				<p class="hint">Drag nodes from the palette to the canvas</p>
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

	:global(.svelte-flow__node.selected) {
		border-color: #ff3e00;
		box-shadow: 0 4px 12px rgba(255, 62, 0, 0.3);
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