<script>
	/**
	 * Three-Panel Modal Base Component
	 * 
	 * Reusable base component providing n8n-style three-panel layout:
	 * - Left: Input data from previous node
	 * - Center: Configuration (modal)
	 * - Right: Output preview
	 * 
	 * This component provides shared functionality for all node types
	 * that need input/output visualization.
	 */
	
	let {
		node,
		onSave,
		onCancel,
		previousNodeOutput = {},
		previousNode = null,
		onRefreshPreviousNode = null,
		onExecuteWorkflow = null,
		inputRequired = false,
		showInputPanel = true,
		showOutputPanel = true,
		testFunction = null,
		children,
		outputSnippet
	} = $props();
	
	// Local state for editing
	let editedNode = $state(JSON.parse(JSON.stringify(node)));
	
	// Previous node test state
	let testingPreviousNode = $state(false);
	let refreshedOutput = $state(null);
	let hasExecutedPreviousNode = $state(false);
	
	// Workflow execution state
	let executingWorkflow = $state(false);
	
	// Input panel tab state
	let activeInputTab = $state('schema'); // 'schema', 'table', 'json'
	let draggedVariable = $state(null);
	let expandedPaths = $state(new Set());
	
	// Output panel state
	let activeOutputTab = $state('preview'); // 'preview', 'json'
	let testResult = $state(null);
	let testingOutput = $state(false);
	
	// Current previous output
	let currentPreviousOutput = $state({});
	
	// Update currentPreviousOutput when dependencies change
	$effect(() => {
		const output = refreshedOutput || previousNodeOutput || {};
		
		// ERROR CHECK: refreshedOutput should NEVER be an array
		// If it is, something is storing the loop output back into refreshedOutput
		if (Array.isArray(output)) {
			console.error('BUG: refreshedOutput is an array! This should never happen.');
			console.error('refreshedOutput:', refreshedOutput);
			console.error('previousNodeOutput:', previousNodeOutput);
			console.trace('Stack trace:');
			throw new Error('refreshedOutput should never be an array - something is storing loop output incorrectly');
		}
		
		currentPreviousOutput = JSON.parse(JSON.stringify(output));
	});
	
	/**
	 * Test previous HTTP node to get fresh data
	 */
	async function handleTestPreviousNode() {
		if (!previousNode || previousNode.data?.type !== 'httpCall') {
			return;
		}
		
		testingPreviousNode = true;
		
		try {
			const response = await fetch('/api/test-http', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(previousNode.data?.config || {})
			});
			
			const data = await response.json();
			
			if (data.success) {
				refreshedOutput = data.response;
				hasExecutedPreviousNode = true;
				// Notify parent to update the previous node output
				if (onRefreshPreviousNode) {
					onRefreshPreviousNode(previousNode.id, data.response);
				}
			} else {
				alert(`Failed to test previous node: ${data.error?.message || 'Unknown error'}`);
			}
		} catch (err) {
			alert(`Error testing previous node: ${err.message}`);
		} finally {
			testingPreviousNode = false;
		}
	}
	
	/**
	 * Execute workflow up to this node to get real data
	 */
	async function handleExecuteWorkflow() {
		if (!onExecuteWorkflow) {
			alert('Workflow execution not yet implemented. This feature will execute the entire workflow up to this node to provide real input data.');
			return;
		}
		
		executingWorkflow = true;
		
		try {
			const result = await onExecuteWorkflow(node.id);
			if (result && result.success) {
				// DON'T set refreshedOutput here - it's already set by the workflow execution
				// The workflow updates each node's testResult, which getPreviousNodeOutput uses
				hasExecutedPreviousNode = true;
			} else {
				alert(`Failed to execute workflow: ${result?.error || 'Unknown error'}`);
			}
		} catch (err) {
			alert(`Error executing workflow: ${err.message}`);
		} finally {
			executingWorkflow = false;
		}
	}
	
	/**
	 * Get value from object by path string
	 */
	export function getValueByPath(obj, path) {
		const parts = path.split(/\.|\[|\]/).filter(Boolean);
		let current = obj;
		
		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}
			current = current[part];
		}
		
		return current;
	}
	
	/**
	 * Extract schema as a tree structure with nesting
	 * All nodes are expanded by default
	 */
	export function extractSchemaTree(obj, prefix = '', level = 0) {
		const items = [];
		
		if (obj === null || obj === undefined) {
			return items;
		}
		
		if (typeof obj !== 'object') {
			return items;
		}
		
		if (Array.isArray(obj)) {
			// For arrays, show each index as a separate item
			obj.forEach((item, index) => {
				const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
				const itemType = Array.isArray(item) ? 'array' : typeof item;
				const isExpandable = typeof item === 'object' && item !== null;
				
				// Default to expanded unless explicitly collapsed
				const isExpanded = expandedPaths.has(itemPath) ? false : true;
				
				items.push({
					path: itemPath,
					label: `[${index}]`,
					type: itemType,
					value: item,
					level,
					isExpandable,
					isExpanded
				});
				
				// Show children if expanded (default is expanded)
				if (isExpandable && isExpanded) {
					items.push(...extractSchemaTree(item, itemPath, level + 1));
				}
			});
		} else {
			// For objects, show each property
			Object.entries(obj).forEach(([key, value]) => {
				const newPath = prefix ? `${prefix}.${key}` : key;
				const valueType = Array.isArray(value) ? 'array' : typeof value;
				const isExpandable = typeof value === 'object' && value !== null;
				
				// Default to expanded unless explicitly collapsed
				const isExpanded = expandedPaths.has(newPath) ? false : true;
				
				items.push({
					path: newPath,
					label: key,
					type: valueType,
					value,
					level,
					isExpandable,
					isExpanded
				});
				
				// Show children if expanded (default is expanded)
				if (isExpandable && isExpanded) {
					items.push(...extractSchemaTree(value, newPath, level + 1));
				}
			});
		}
		
		return items;
	}
	
	/**
	 * Toggle expand/collapse for a path
	 * Since we default to expanded, we track collapsed paths
	 */
	function toggleExpand(path) {
		if (expandedPaths.has(path)) {
			// Currently collapsed, so expand it (remove from set)
			expandedPaths.delete(path);
		} else {
			// Currently expanded, so collapse it (add to set)
			expandedPaths.add(path);
		}
		expandedPaths = new Set(expandedPaths); // Trigger reactivity
	}
	
	/**
	 * Convert data to table format
	 */
	export function dataToTable(obj) {
		const rows = [];
		
		function flatten(data, prefix = '') {
			if (data === null || data === undefined) {
				rows.push({ key: prefix || 'value', value: String(data), type: typeof data });
				return;
			}
			
			if (typeof data !== 'object') {
				rows.push({ key: prefix || 'value', value: String(data), type: typeof data });
				return;
			}
			
			if (Array.isArray(data)) {
				data.forEach((item, index) => {
					flatten(item, prefix ? `${prefix}[${index}]` : `[${index}]`);
				});
			} else {
				Object.entries(data).forEach(([key, value]) => {
					const newKey = prefix ? `${prefix}.${key}` : key;
					if (typeof value === 'object' && value !== null) {
						flatten(value, newKey);
					} else {
						rows.push({ key: newKey, value: String(value), type: typeof value });
					}
				});
			}
		}
		
		flatten(obj);
		return rows;
	}
	
	/**
	 * Handle drag start for variables
	 */
	function handleDragStart(event, path) {
		draggedVariable = path;
		event.dataTransfer.effectAllowed = 'copy';
		event.dataTransfer.setData('text/plain', `{{${path}}}`);
	}
	
	/**
	 * Handle drag end
	 */
	function handleDragEnd() {
		draggedVariable = null;
	}
	
	/**
	 * Insert variable into target field
	 */
	export function insertVariable(path, targetFieldId) {
		const variable = `{{${path}}}`;
		const target = document.getElementById(targetFieldId);
		
		if (target && (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) {
			const start = target.selectionStart;
			const end = target.selectionEnd;
			const text = target.value || '';
			
			target.value = text.substring(0, start) + variable + text.substring(end);
			
			// Trigger input event for Svelte binding
			target.dispatchEvent(new Event('input', { bubbles: true }));
			
			// Set cursor position after inserted variable
			setTimeout(() => {
				target.focus();
				const newPos = start + variable.length;
				target.setSelectionRange(newPos, newPos);
			}, 0);
		}
	}
	
	/**
	 * Get type icon
	 */
	export function getTypeIcon(type) {
		switch (type) {
			case 'string': return '📝';
			case 'number': return '🔢';
			case 'boolean': return '✓';
			case 'array': return '📋';
			case 'object': return '📦';
			default: return '•';
		}
	}
	
	// Derived state
	const schemaData = $derived(extractSchemaTree(currentPreviousOutput));
	const tableData = $derived(dataToTable(currentPreviousOutput));
	
	function handleCancel() {
		onCancel();
	}
	
	function handleOverlayClick(event) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
	
	/**
	 * Handle test button click
	 */
	async function handleTest() {
		if (!testFunction) return;
		
		// Prevent double execution
		if (testingOutput) {
			console.log('Test already in progress, skipping');
			console.trace('Called from:');
			return;
		}
		
		testingOutput = true;
		testResult = null;
		
		try {
			console.log('=== ThreePanelModal handleTest ===');
			console.trace('handleTest called from:');
			console.log('Config:', editedNode.data?.config);
			console.log('Input data:', currentPreviousOutput);
			console.log('================================');
			
			const result = await testFunction(editedNode.data?.config || {}, currentPreviousOutput);
			
			console.log('=== Test Result ===');
			console.log('Result:', result);
			console.log('==================');
			
			testResult = result;
		} catch (err) {
			console.error('Test error:', err);
			testResult = { success: false, error: err.message };
		} finally {
			testingOutput = false;
		}
	}
	
	// Create context object for child components
	const context = $derived({
		editedNode,
		currentPreviousOutput,
		insertVariable,
		onSave,
		onCancel: handleCancel,
		testResult,
		testingOutput,
		onTest: handleTest,
		activeOutputTab
	});
</script>

<div class="transform-modal-overlay" onclick={handleOverlayClick} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="dialog" aria-modal="true" tabindex="-1">
	<div class="transform-modal-container" style:grid-template-columns={showInputPanel && showOutputPanel ? '350px 1fr 350px' : showInputPanel ? '350px 1fr' : showOutputPanel ? '1fr 350px' : '1fr'}>
		<!-- Left Panel: Input -->
		{#if showInputPanel}
			<div class="side-panel input-panel">
				<div class="panel-header">
					<div class="header-content">
						<h3>Input</h3>
						<div class="header-actions">
							<button
								class="btn-execute-workflow"
								onclick={handleExecuteWorkflow}
								disabled={executingWorkflow}
								title="Execute workflow up to this node"
							>
								{#if executingWorkflow}
									<span class="spinner-small"></span>
								{:else}
									▶️ Execute
								{/if}
							</button>
							{#if previousNode && previousNode.data?.type === 'httpCall'}
								<button
									class="btn-refresh-small"
									onclick={handleTestPreviousNode}
									disabled={testingPreviousNode}
									title="Re-execute previous node only"
								>
									{#if testingPreviousNode}
										<span class="spinner-small"></span>
									{:else}
										🔄 Refresh
									{/if}
								</button>
							{/if}
						</div>
					</div>
					{#if hasExecutedPreviousNode || Object.keys(currentPreviousOutput).length > 0}
						<div class="tabs">
							<button
								class="tab"
								class:active={activeInputTab === 'schema'}
								onclick={() => activeInputTab = 'schema'}
							>
								Schema
							</button>
							<button
								class="tab"
								class:active={activeInputTab === 'table'}
								onclick={() => activeInputTab = 'table'}
							>
								Table
							</button>
							<button
								class="tab"
								class:active={activeInputTab === 'json'}
								onclick={() => activeInputTab = 'json'}
							>
								JSON
							</button>
						</div>
					{/if}
				</div>
				<div class="panel-content">
					{#if !hasExecutedPreviousNode && previousNode && previousNode.data?.type === 'httpCall'}
						<div class="execute-prompt">
							<p>Execute the previous node to see input data</p>
							<button
								class="btn-execute-previous"
								onclick={handleTestPreviousNode}
								disabled={testingPreviousNode}
							>
								{#if testingPreviousNode}
									<span class="spinner"></span>
									Executing...
								{:else}
									▶ Execute Previous Node
								{/if}
							</button>
						</div>
					{:else if hasExecutedPreviousNode || Object.keys(currentPreviousOutput).length > 0}
						{#if activeInputTab === 'schema'}
							<div class="schema-view">
								{#if schemaData.length === 0}
									<div class="empty-state">
										<p>No data available</p>
									</div>
								{:else}
									<div class="schema-list">
										{#each schemaData as item}
											<div
												class="schema-item"
												class:dragging={draggedVariable === item.path}
												style="padding-left: {item.level * 1.5 + 0.5}rem"
											>
												{#if item.isExpandable}
													<button
														class="expand-btn"
														onclick={() => toggleExpand(item.path)}
														aria-label={item.isExpanded ? 'Collapse' : 'Expand'}
													>
														{item.isExpanded ? '▼' : '▶'}
													</button>
												{:else}
													<span class="expand-spacer"></span>
												{/if}
												
												<div
													class="schema-item-content"
													draggable={!item.isExpandable}
													ondragstart={(e) => !item.isExpandable && handleDragStart(e, item.path)}
													ondragend={handleDragEnd}
													title={item.isExpandable ? `${item.type} - click arrow to expand` : `Click or drag to insert {{${item.path}}}`}
												>
													<span class="type-icon">{getTypeIcon(item.type)}</span>
													<span class="variable-label">{item.label}</span>
													{#if !item.isExpandable}
														<span class="variable-value">{String(item.value).substring(0, 40)}{String(item.value).length > 40 ? '...' : ''}</span>
													{/if}
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{:else if activeInputTab === 'table'}
							<div class="table-view">
								{#if tableData.length === 0}
									<div class="empty-state">
										<p>No data available</p>
									</div>
								{:else}
									<table class="data-table">
										<thead>
											<tr>
												<th>Key</th>
												<th>Value</th>
												<th>Type</th>
											</tr>
										</thead>
										<tbody>
											{#each tableData as row}
												<tr>
													<td class="key-cell">{row.key}</td>
													<td class="value-cell">{row.value}</td>
													<td class="type-cell">{row.type}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{/if}
							</div>
						{:else}
							<div class="json-view">
								<pre class="json-display">{JSON.stringify(currentPreviousOutput, null, 2)}</pre>
							</div>
						{/if}
					{:else}
						<div class="empty-state">
							<p>No input data available</p>
							<small>Connect a previous node to see input</small>
						</div>
					{/if}
				</div>
			</div>
		{/if}
		
		<!-- Center: Configuration Modal -->
		<div class="center-modal">
			{@render children(context)}
		</div>
		
		<!-- Right Panel: Output Preview -->
		{#if showOutputPanel}
			<div class="side-panel output-panel">
				<div class="panel-header">
					<h3>Output</h3>
					{#if testFunction}
						<div class="tabs">
							<button
								class="tab"
								class:active={activeOutputTab === 'preview'}
								onclick={() => activeOutputTab = 'preview'}
							>
								Preview
							</button>
							<button
								class="tab"
								class:active={activeOutputTab === 'json'}
								onclick={() => activeOutputTab = 'json'}
							>
								JSON
							</button>
						</div>
					{/if}
				</div>
				<div class="panel-content">
					{#if outputSnippet}
						{@render outputSnippet({
							testResult,
							testingOutput,
							currentPreviousOutput,
							activeOutputTab
						})}
					{:else}
						<div class="empty-state">
							<p>Output preview will appear here</p>
							<small>Configure the node and test to see output</small>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.transform-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 2rem;
	}
	
	.transform-modal-container {
		display: grid;
		gap: 1rem;
		width: 100%;
		max-width: 1600px;
		height: 85vh;
		max-height: 900px;
	}
	
	/* Side Panels */
	.side-panel {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	.panel-header {
		border-bottom: 1px solid #e0e0e0;
		background: #f8f9fa;
	}
	
	.header-content {
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	
	.btn-execute-workflow {
		background: none;
		border: none;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		border-radius: 4px;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	
	.btn-execute-workflow:hover:not(:disabled) {
		background: #f0f0f0;
	}
	
	.btn-execute-workflow:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.panel-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.tabs {
		display: flex;
		gap: 0;
		border-top: 1px solid #e0e0e0;
	}
	
	.tab {
		flex: 1;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border: none;
		border-right: 1px solid #e0e0e0;
		font-size: 0.75rem;
		font-weight: 500;
		color: #666;
		cursor: pointer;
		transition: all 0.2s;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.tab:last-child {
		border-right: none;
	}
	
	.tab:hover {
		background: #e9ecef;
		color: #333;
	}
	
	.tab.active {
		background: white;
		color: var(--color-theme-1, #4075a6);
		font-weight: 600;
		border-bottom: 2px solid var(--color-theme-1, #4075a6);
	}
	
	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}
	
	/* Schema View */
	.schema-view {
		height: 100%;
		overflow-y: auto;
		padding: 0.5rem 0;
	}
	
	.schema-list {
		display: flex;
		flex-direction: column;
	}
	
	.schema-item {
		display: flex;
		align-items: stretch;
		gap: 0;
		font-size: 0.8125rem;
		position: relative;
	}
	
	.expand-btn {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		font-size: 0.625rem;
		color: #999;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		flex-shrink: 0;
		transition: all 0.15s ease;
		margin-right: 0.25rem;
		align-self: center;
	}
	
	.expand-btn:hover {
		background: #f0f0f0;
		color: #555;
	}
	
	.expand-spacer {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		margin-right: 0.25rem;
		align-self: center;
	}
	
	.schema-item-content {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		background: #fafbfc;
		border: 1px solid #e1e4e8;
		border-radius: 5px;
		transition: all 0.2s ease;
		flex: 1;
		min-width: 0;
		min-height: 2rem;
	}
	
	.schema-item-content[draggable="true"] {
		cursor: grab;
	}
	
	.schema-item-content[draggable="true"]:hover {
		background: #f3f8ff;
		border-color: var(--color-theme-1, #4075a6);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		transform: translateX(2px);
	}
	
	.schema-item-content[draggable="true"]:active {
		cursor: grabbing;
		transform: scale(0.98);
	}
	
	.schema-item.dragging .schema-item-content {
		opacity: 0.4;
		cursor: grabbing;
	}
	
	.type-icon {
		font-size: 1rem;
		flex-shrink: 0;
		opacity: 0.85;
	}
	
	.variable-label {
		font-weight: 600;
		color: #24292e;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.8125rem;
		flex-shrink: 0;
		letter-spacing: -0.01em;
	}
	
	.variable-value {
		color: #6a737d;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-style: italic;
		opacity: 0.9;
	}
	
	/* Table View */
	.table-view {
		height: 100%;
		overflow-y: auto;
	}
	
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}
	
	.data-table thead {
		position: sticky;
		top: 0;
		background: #f8f9fa;
		z-index: 1;
	}
	
	.data-table th {
		padding: 0.5rem;
		text-align: left;
		font-weight: 600;
		color: #666;
		border-bottom: 2px solid #e0e0e0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: 0.7rem;
	}
	
	.data-table td {
		padding: 0.5rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.key-cell {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		color: #333;
		font-weight: 500;
	}
	
	.value-cell {
		color: #666;
		word-break: break-word;
	}
	
	.type-cell {
		color: #999;
		font-size: 0.7rem;
		text-transform: uppercase;
	}
	
	/* JSON View */
	.json-view {
		height: 100%;
		overflow-y: auto;
	}
	
	/* Input Panel */
	.execute-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		gap: 1rem;
		padding: 2rem;
	}
	
	.execute-prompt p {
		margin: 0;
		color: #666;
		font-size: 0.875rem;
	}
	
	.btn-execute-previous {
		background: #10b981;
		color: white;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}
	
	.btn-execute-previous:hover:not(:disabled) {
		background: #059669;
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
	}
	
	.btn-execute-previous:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.btn-refresh-small {
		background: none;
		border: none;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.875rem;
		border-radius: 4px;
		transition: background 0.2s;
	}
	
	.btn-refresh-small:hover:not(:disabled) {
		background: #f0f0f0;
	}
	
	.btn-refresh-small:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	
	.spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	
	.spinner-small {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: #666;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.json-display {
		flex: 1;
		margin: 0;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		overflow: auto;
		color: #333;
	}
	
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: #666;
		padding: 2rem;
	}
	
	.empty-state p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
	}
	
	.empty-state small {
		font-size: 0.75rem;
		color: #999;
	}
	
	/* Center Modal */
	.center-modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	
	/* Scrollbar styling */
	.panel-content::-webkit-scrollbar {
		width: 8px;
	}
	
	.panel-content::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.panel-content::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.panel-content::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>