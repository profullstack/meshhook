<script>
	import { SvelteFlow, Controls, MiniMap, Background, Panel } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	// Props
	let { nodes = $bindable([]), edges = $bindable([]), onNodesChange, onEdgesChange } = $props();

	// State
	let selectedNode = $state(null);
	let selectedEdge = $state(null);

	// Node types configuration
	const nodeTypes = {
		httpCall: 'default',
		transform: 'default',
		delay: 'default',
		terminate: 'default',
		conditional: 'default'
	};

	// Edge types configuration
	const edgeTypes = {
		default: 'smoothstep'
	};

	// Handle node selection
	function handleNodeClick(event) {
		selectedNode = event.detail.node;
		selectedEdge = null;
	}

	// Handle edge selection
	function handleEdgeClick(event) {
		selectedEdge = event.detail.edge;
		selectedNode = null;
	}

	// Handle pane click (deselect)
	function handlePaneClick() {
		selectedNode = null;
		selectedEdge = null;
	}

	// Handle connection creation
	function handleConnect(event) {
		const { source, target, sourceHandle, targetHandle } = event.detail;

		const newEdge = {
			id: `e${source}-${target}`,
			source,
			target,
			sourceHandle,
			targetHandle,
			type: 'smoothstep',
			animated: true
		};

		edges = [...edges, newEdge];

		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}

	// Handle node drag
	function handleNodeDragStop(event) {
		if (onNodesChange) {
			onNodesChange(nodes);
		}
	}

	// Handle node deletion
	function handleNodesDelete(event) {
		const deletedNodes = event.detail.nodes;
		const deletedNodeIds = new Set(deletedNodes.map((n) => n.id));

		// Remove deleted nodes
		nodes = nodes.filter((n) => !deletedNodeIds.has(n.id));

		// Remove edges connected to deleted nodes
		edges = edges.filter((e) => !deletedNodeIds.has(e.source) && !deletedNodeIds.has(e.target));

		if (onNodesChange) {
			onNodesChange(nodes);
		}
		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}

	// Handle edge deletion
	function handleEdgesDelete(event) {
		const deletedEdges = event.detail.edges;
		const deletedEdgeIds = new Set(deletedEdges.map((e) => e.id));

		edges = edges.filter((e) => !deletedEdgeIds.has(e.id));

		if (onEdgesChange) {
			onEdgesChange(edges);
		}
	}
</script>

<div class="workflow-editor">
	<SvelteFlow
		{nodes}
		{edges}
		{nodeTypes}
		{edgeTypes}
		fitView
		snapToGrid={true}
		snapGrid={[15, 15]}
		defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
		onNodeClick={handleNodeClick}
		onEdgeClick={handleEdgeClick}
		onPaneClick={handlePaneClick}
		onConnect={handleConnect}
		onNodeDragStop={handleNodeDragStop}
		onNodesDelete={handleNodesDelete}
		onEdgesDelete={handleEdgesDelete}
	>
		<Background variant="dots" gap={12} size={1} />
		<Controls />
		<MiniMap nodeStrokeWidth={3} zoomable pannable />

		<Panel position="top-left">
			<div class="info-panel">
				<h3>Workflow Editor</h3>
				<p class="hint">
					{#if selectedNode}
						Selected: <strong>{selectedNode.data.label}</strong>
					{:else if selectedEdge}
						Selected: Edge
					{:else}
						Click a node to configure it
					{/if}
				</p>
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