<script>
	/**
	 * Loop Container Node Component
	 * 
	 * A custom SvelteFlow node that acts as a visual container (swimlane) for other nodes.
	 * Nodes can be dragged into this container, and during execution, the loop will
	 * iterate over an array and execute child nodes once per item.
	 */
	
	import { Handle, Position } from '@xyflow/svelte';
	
	// Props from SvelteFlow
	let { data, id } = $props();
	
	// Container dimensions from node data
	const width = $derived(data.dimensions?.width || 600);
	const height = $derived(data.dimensions?.height || 400);
	
	// Child node count
	const childCount = $derived(data.childNodes?.length || 0);
	
	// Loop expression
	const loopExpression = $derived(data.config?.items || 'data[*]');
	
	// Check if container is being dragged over (for drop feedback)
	let isDragOver = $state(false);
	
	/**
	 * Handle drag over event
	 */
	function handleDragOver(event) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = true;
	}
	
	/**
	 * Handle drag leave event
	 */
	function handleDragLeave(event) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
	}
	
	/**
	 * Handle drop event
	 */
	function handleDrop(event) {
		event.preventDefault();
		event.stopPropagation();
		isDragOver = false;
		
		// The actual drop handling will be done by the WorkflowEditor
		// This just provides visual feedback
	}
</script>

<div
	class="loop-container-node"
	class:drag-over={isDragOver}
	style="width: {width}px; height: {height}px;"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
	aria-label="Loop container"
>
	<!-- Input handle (top center) -->
	<Handle
		type="target"
		position={Position.Top}
		id="input"
		style="left: 50%; transform: translateX(-50%);"
	/>
	
	<!-- Container header -->
	<div class="container-header">
		<div class="header-left">
			<span class="loop-icon">🔁</span>
			<div class="header-info">
				<h3 class="container-title">{data.label || 'Loop Container'}</h3>
				<code class="loop-expression">{loopExpression}</code>
			</div>
		</div>
		<div class="header-right">
			<span class="child-count" title="{childCount} child node{childCount === 1 ? '' : 's'}">
				{childCount} {childCount === 1 ? 'node' : 'nodes'}
			</span>
		</div>
	</div>
	
	<!-- Container body (where child nodes are rendered) -->
	<div class="container-body">
		{#if childCount === 0}
			<div class="empty-state">
				<div class="empty-icon">📦</div>
				<p class="empty-text">Drag nodes here to add to loop</p>
				<p class="empty-hint">Nodes inside will execute once per array item</p>
			</div>
		{:else}
			<div class="child-nodes-area">
				<!-- Child nodes are rendered by SvelteFlow at their absolute positions -->
				<!-- This area just provides visual grouping -->
			</div>
		{/if}
	</div>
	
	<!-- Container footer -->
	<div class="container-footer">
		<span class="footer-text">Output: Array of results</span>
	</div>
	
	<!-- Output handle (bottom center) -->
	<Handle
		type="source"
		position={Position.Bottom}
		id="output"
		style="left: 50%; transform: translateX(-50%);"
	/>
</div>

<style>
	.loop-container-node {
		position: relative;
		background: linear-gradient(135deg, #f0f4f8 0%, #e8eef4 100%);
		border: 3px solid #4075a6;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: all 0.3s ease;
	}
	
	.loop-container-node.drag-over {
		border-color: #10b981;
		background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
		box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
	}
	
	.loop-container-node:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
	}
	
	/* Container Header */
	.container-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, #4075a6 0%, #305a7a 100%);
		color: white;
		border-bottom: 2px solid rgba(255, 255, 255, 0.2);
	}
	
	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
	}
	
	.loop-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	
	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		flex: 1;
	}
	
	.container-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.loop-expression {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(0, 0, 0, 0.2);
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
	
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	
	.child-count {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}
	
	/* Container Body */
	.container-body {
		flex: 1;
		position: relative;
		overflow: hidden;
		min-height: 200px;
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
		text-align: center;
	}
	
	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}
	
	.empty-text {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 500;
		color: #4075a6;
	}
	
	.empty-hint {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
		font-style: italic;
	}
	
	.child-nodes-area {
		width: 100%;
		height: 100%;
		position: relative;
	}
	
	/* Container Footer */
	.container-footer {
		padding: 0.75rem 1.25rem;
		background: rgba(64, 117, 166, 0.1);
		border-top: 1px solid rgba(64, 117, 166, 0.2);
		text-align: center;
	}
	
	.footer-text {
		font-size: 0.75rem;
		color: #4075a6;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	/* Handles */
	:global(.loop-container-node .svelte-flow__handle) {
		width: 14px;
		height: 14px;
		background: #4075a6;
		border: 3px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	
	:global(.loop-container-node .svelte-flow__handle:hover) {
		background: #10b981;
		transform: scale(1.2);
	}
	
	/* Selected state */
	:global(.loop-container-node.selected) {
		border-color: #ff3e00;
		box-shadow: 0 6px 20px rgba(255, 62, 0, 0.3);
	}
	
	:global(.loop-container-node.selected .container-header) {
		background: linear-gradient(135deg, #ff3e00 0%, #cc3200 100%);
	}
</style>