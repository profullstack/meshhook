<script>
	// Node type definitions
	const nodeCategories = [
		{
			name: 'Triggers',
			nodes: [
				{
					type: 'webhook',
					label: 'Webhook',
					icon: '🔗',
					description: 'Trigger workflow via HTTP webhook'
				},
				{
					type: 'schedule',
					label: 'Schedule',
					icon: '⏰',
					description: 'Trigger workflow on a schedule'
				}
			]
		},
		{
			name: 'Actions',
			nodes: [
				{
					type: 'httpCall',
					label: 'HTTP Call',
					icon: '🌐',
					description: 'Make HTTP request to external API'
				},
				{
					type: 'transform',
					label: 'Transform',
					icon: '🔄',
					description: 'Transform data using JMESPath'
				},
				{
					type: 'xmlJsonTransform',
					label: 'XML ↔ JSON',
					icon: '🔀',
					description: 'Transform between XML and JSON formats'
				},
				{
					type: 'delay',
					label: 'Delay',
					icon: '⏱️',
					description: 'Wait for specified duration'
				}
			]
		},
		{
			name: 'Logic',
			nodes: [
				{
					type: 'conditional',
					label: 'Conditional',
					icon: '🔀',
					description: 'Branch based on condition'
				},
				{
					type: 'branch',
					label: 'Branch',
					icon: '🌿',
					description: 'Split flow to multiple paths'
				},
				{
					type: 'loop',
					label: 'Loop',
					icon: '🔁',
					description: 'Iterate over array items'
				}
			]
		},
		{
			name: 'Control',
			nodes: [
				{
					type: 'terminate',
					label: 'Terminate',
					icon: '🛑',
					description: 'End workflow execution'
				}
			]
		}
	];

	let expandedCategories = $state(new Set(['Triggers', 'Actions']));

	function toggleCategory(categoryName) {
		if (expandedCategories.has(categoryName)) {
			expandedCategories.delete(categoryName);
		} else {
			expandedCategories.add(categoryName);
		}
		expandedCategories = new Set(expandedCategories);
	}

	function onDragStart(event, nodeType, label) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData(
			'application/reactflow',
			JSON.stringify({ type: nodeType, label })
		);
	}
</script>

<div class="node-palette">
	<div class="palette-header">
		<h3>Node Palette</h3>
		<p class="hint">Drag nodes to canvas</p>
	</div>

	<div class="palette-content">
		{#each nodeCategories as category}
			<div class="category">
				<button
					class="category-header"
					class:expanded={expandedCategories.has(category.name)}
					onclick={() => toggleCategory(category.name)}
				>
					<span class="category-icon">
						{expandedCategories.has(category.name) ? '▼' : '▶'}
					</span>
					<span class="category-name">{category.name}</span>
					<span class="category-count">{category.nodes.length}</span>
				</button>

				{#if expandedCategories.has(category.name)}
					<div class="category-nodes">
						{#each category.nodes as node}
							<div
								class="node-item"
								draggable="true"
								ondragstart={(e) => onDragStart(e, node.type, node.label)}
								role="button"
								tabindex="0"
							>
								<div class="node-icon">{node.icon}</div>
								<div class="node-info">
									<div class="node-label">{node.label}</div>
									<div class="node-description">{node.description}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.node-palette {
		width: 280px;
		height: 100%;
		background: white;
		border-right: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.palette-header {
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.palette-header h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}

	.palette-header .hint {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
	}

	.palette-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0;
	}

	.category {
		margin-bottom: 0.5rem;
	}

	.category-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		text-align: left;
		transition: background 0.2s;
	}

	.category-header:hover {
		background: #f5f5f5;
	}

	.category-icon {
		font-size: 0.75rem;
		color: #666;
	}

	.category-name {
		flex: 1;
	}

	.category-count {
		font-size: 0.75rem;
		color: #999;
		background: #f0f0f0;
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
	}

	.category-nodes {
		padding: 0.5rem 0;
	}

	.node-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		margin: 0.25rem 0.5rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		cursor: grab;
		transition: all 0.2s;
	}

	.node-item:hover {
		background: #f8f9fa;
		border-color: #4075a6;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.node-item:active {
		cursor: grabbing;
		transform: scale(0.98);
	}

	.node-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.node-info {
		flex: 1;
		min-width: 0;
	}

	.node-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		margin-bottom: 0.25rem;
	}

	.node-description {
		font-size: 0.75rem;
		color: #666;
		line-height: 1.4;
	}

	/* Scrollbar styling */
	.palette-content::-webkit-scrollbar {
		width: 6px;
	}

	.palette-content::-webkit-scrollbar-track {
		background: #f1f1f1;
	}

	.palette-content::-webkit-scrollbar-thumb {
		background: #ccc;
		border-radius: 3px;
	}

	.palette-content::-webkit-scrollbar-thumb:hover {
		background: #999;
	}
</style>