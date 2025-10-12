<script>
	/**
	 * Variable Picker and Template Builder Component
	 * 
	 * Allows users to:
	 * 1. Pick variables from previous node output (left pane)
	 * 2. Build templates with variable substitution (center pane)
	 * 3. Preview sample output (right pane)
	 */
	
	let {
		previousNodeOutput = {},
		template = $bindable(''),
		onTemplateChange = () => {}
	} = $props();
	
	// Convert previousNodeOutput to a plain object to avoid immutability issues
	let nodeOutput = $state({});
	
	$effect(() => {
		nodeOutput = previousNodeOutput ? JSON.parse(JSON.stringify(previousNodeOutput)) : {};
	});
	
	// State
	let sampleOutput = $state('');
	let selectedPath = $state('');
	let expandedPaths = $state(new Set());
	
	/**
	 * Extract all paths from an object recursively
	 */
	function extractPaths(obj, prefix = '') {
		const paths = [];
		
		if (obj === null || obj === undefined) {
			return paths;
		}
		
		if (typeof obj !== 'object') {
			return [{ path: prefix, value: obj, type: typeof obj }];
		}
		
		if (Array.isArray(obj)) {
			paths.push({ path: prefix, value: obj, type: 'array', isExpandable: true });
			obj.forEach((item, index) => {
				const itemPath = `${prefix}[${index}]`;
				paths.push(...extractPaths(item, itemPath));
			});
		} else {
			if (prefix) {
				paths.push({ path: prefix, value: obj, type: 'object', isExpandable: true });
			}
			Object.entries(obj).forEach(([key, value]) => {
				const newPath = prefix ? `${prefix}.${key}` : key;
				paths.push(...extractPaths(value, newPath));
			});
		}
		
		return paths;
	}
	
	/**
	 * Get hierarchical structure for tree view
	 */
	function getTreeStructure(obj, prefix = '', level = 0) {
		const items = [];
		
		if (obj === null || obj === undefined) {
			return items;
		}
		
		if (typeof obj !== 'object') {
			return items;
		}
		
		if (Array.isArray(obj)) {
			obj.forEach((item, index) => {
				const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
				const isExpandable = typeof item === 'object' && item !== null;
				items.push({
					path: itemPath,
					label: `[${index}]`,
					value: item,
					type: Array.isArray(item) ? 'array' : typeof item,
					level,
					isExpandable
				});
				if (isExpandable && expandedPaths.has(itemPath)) {
					items.push(...getTreeStructure(item, itemPath, level + 1));
				}
			});
		} else {
			Object.entries(obj).forEach(([key, value]) => {
				const newPath = prefix ? `${prefix}.${key}` : key;
				const isExpandable = typeof value === 'object' && value !== null;
				items.push({
					path: newPath,
					label: key,
					value,
					type: Array.isArray(value) ? 'array' : typeof value,
					level,
					isExpandable
				});
				if (isExpandable && expandedPaths.has(newPath)) {
					items.push(...getTreeStructure(value, newPath, level + 1));
				}
			});
		}
		
		return items;
	}
	
	/**
	 * Toggle path expansion in tree view
	 */
	function toggleExpand(path) {
		if (expandedPaths.has(path)) {
			expandedPaths.delete(path);
		} else {
			expandedPaths.add(path);
		}
		expandedPaths = new Set(expandedPaths);
	}
	
	/**
	 * Insert variable into template at cursor position
	 */
	function insertVariable(path) {
		const variable = `{{${path}}}`;
		const textarea = document.getElementById('template-input');
		
		if (textarea && textarea instanceof HTMLTextAreaElement) {
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const text = template || '';
			
			template = text.substring(0, start) + variable + text.substring(end);
			onTemplateChange(template);
			
			// Set cursor position after inserted variable
			setTimeout(() => {
				textarea.focus();
				const newPos = start + variable.length;
				textarea.setSelectionRange(newPos, newPos);
			}, 0);
		} else {
			template = (template || '') + variable;
			onTemplateChange(template);
		}
		
		updatePreview();
	}
	
	/**
	 * Process template with variable substitution
	 */
	function processTemplate(templateStr, data) {
		if (!templateStr) return '';
		
		try {
			return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
				const trimmedPath = path.trim();
				const value = getValueByPath(data, trimmedPath);
				
				if (value === undefined || value === null) {
					return match; // Keep original if not found
				}
				
				if (typeof value === 'object') {
					return JSON.stringify(value, null, 2);
				}
				
				return String(value);
			});
		} catch (error) {
			return `Error: ${error.message}`;
		}
	}
	
	/**
	 * Get value from object by path string
	 */
	function getValueByPath(obj, path) {
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
	 * Update preview when template changes
	 */
	function updatePreview() {
		sampleOutput = processTemplate(template, nodeOutput);
	}
	
	/**
	 * Format value for display
	 */
	function formatValue(value, type) {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (type === 'string') return `"${value}"`;
		if (type === 'object' || type === 'array') {
			return JSON.stringify(value);
		}
		return String(value);
	}
	
	/**
	 * Get type icon
	 */
	function getTypeIcon(type) {
		switch (type) {
			case 'string': return '📝';
			case 'number': return '🔢';
			case 'boolean': return '✓';
			case 'array': return '📋';
			case 'object': return '📦';
			default: return '•';
		}
	}
	
	// Reactive: Update preview when template or data changes
	$effect(() => {
		updatePreview();
	});
	
	const treeItems = $derived(getTreeStructure(nodeOutput));
</script>

<div class="variable-picker-container">
	<!-- Left Pane: Variable Tree -->
	<div class="pane variables-pane">
		<div class="pane-header">
			<h3>Available Variables</h3>
			<span class="hint">Click to insert</span>
		</div>
		<div class="pane-content">
			{#if treeItems.length === 0}
				<div class="empty-state">
					<p>No previous node output available</p>
					<small>Connect this node to see available variables</small>
				</div>
			{:else}
				<div class="tree-view">
					{#each treeItems as item}
						<div 
							class="tree-item" 
							class:selected={selectedPath === item.path}
							style="padding-left: {item.level * 1.5}rem"
						>
							{#if item.isExpandable}
								<button 
									class="expand-btn"
									onclick={() => toggleExpand(item.path)}
									aria-label={expandedPaths.has(item.path) ? 'Collapse' : 'Expand'}
								>
									{expandedPaths.has(item.path) ? '▼' : '▶'}
								</button>
							{:else}
								<span class="expand-spacer"></span>
							{/if}
							
							<button
								class="variable-btn"
								onclick={() => {
									selectedPath = item.path;
									if (!item.isExpandable) {
										insertVariable(item.path);
									}
								}}
								title={`Insert {{${item.path}}}`}
							>
								<span class="type-icon">{getTypeIcon(item.type)}</span>
								<span class="variable-label">{item.label}</span>
								{#if !item.isExpandable}
									<span class="variable-value">
										{formatValue(item.value, item.type)}
									</span>
								{/if}
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Center Pane: Template Editor -->
	<div class="pane template-pane">
		<div class="pane-header">
			<h3>Template</h3>
			<span class="hint">Use {'{{variable}}'} syntax</span>
		</div>
		<div class="pane-content">
			<textarea
				id="template-input"
				bind:value={template}
				oninput={() => {
					onTemplateChange(template);
					updatePreview();
				}}
				placeholder="Enter your template here...&#10;&#10;Example:&#10;Hello {'{{name}}'}!&#10;Your order #{'{{order.id}}'} is {'{{status}}'}."
				spellcheck="false"
			></textarea>
			
			<div class="template-help">
				<details>
					<summary>Template Syntax Help</summary>
					<ul>
						<li><code>{'{{variable}}'}</code> - Insert simple variable</li>
						<li><code>{'{{object.property}}'}</code> - Access nested property</li>
						<li><code>{'{{array[0]}}'}</code> - Access array element</li>
						<li><code>{'{{data.items[0].name}}'}</code> - Complex path</li>
					</ul>
				</details>
			</div>
		</div>
	</div>
	
	<!-- Right Pane: Preview -->
	<div class="pane preview-pane">
		<div class="pane-header">
			<h3>Preview Output</h3>
			<span class="hint">Live preview</span>
		</div>
		<div class="pane-content">
			{#if !template}
				<div class="empty-state">
					<p>Preview will appear here</p>
					<small>Start typing in the template editor</small>
				</div>
			{:else}
				<pre class="preview-output">{sampleOutput}</pre>
			{/if}
		</div>
	</div>
</div>

<style>
	.variable-picker-container {
		display: grid;
		grid-template-columns: 1fr 1.5fr 1fr;
		gap: 1rem;
		height: 500px;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		overflow: hidden;
	}
	
	.pane {
		display: flex;
		flex-direction: column;
		background: white;
		border-right: 1px solid #e0e0e0;
	}
	
	.pane:last-child {
		border-right: none;
	}
	
	.pane-header {
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
		background: #f8f9fa;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.pane-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}
	
	.hint {
		font-size: 0.75rem;
		color: #666;
	}
	
	.pane-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
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
	
	/* Variables Pane */
	.tree-view {
		font-size: 0.875rem;
	}
	
	.tree-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 0.125rem;
	}
	
	.tree-item.selected .variable-btn {
		background: #e3f2fd;
	}
	
	.expand-btn {
		background: none;
		border: none;
		padding: 0.25rem;
		cursor: pointer;
		font-size: 0.625rem;
		color: #666;
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px;
	}
	
	.expand-btn:hover {
		background: #f0f0f0;
	}
	
	.expand-spacer {
		width: 1.25rem;
		height: 1.25rem;
		display: inline-block;
	}
	
	.variable-btn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		transition: background 0.15s;
		min-width: 0;
	}
	
	.variable-btn:hover {
		background: #f5f5f5;
	}
	
	.type-icon {
		font-size: 0.875rem;
		flex-shrink: 0;
	}
	
	.variable-label {
		font-weight: 500;
		color: #333;
		flex-shrink: 0;
	}
	
	.variable-value {
		color: #666;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}
	
	/* Template Pane */
	.template-pane .pane-content {
		display: flex;
		flex-direction: column;
		padding: 0;
	}
	
	#template-input {
		flex: 1;
		width: 100%;
		padding: 1rem;
		border: none;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		resize: none;
		outline: none;
	}
	
	.template-help {
		border-top: 1px solid #e0e0e0;
		padding: 0.5rem 1rem;
		background: #f8f9fa;
	}
	
	.template-help details {
		font-size: 0.75rem;
	}
	
	.template-help summary {
		cursor: pointer;
		color: #666;
		user-select: none;
	}
	
	.template-help summary:hover {
		color: #333;
	}
	
	.template-help ul {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
		color: #666;
	}
	
	.template-help li {
		margin-bottom: 0.25rem;
	}
	
	.template-help code {
		background: #e0e0e0;
		padding: 0.125rem 0.25rem;
		border-radius: 2px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
	}
	
	/* Preview Pane */
	.preview-output {
		margin: 0;
		padding: 1rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
		color: #333;
		background: #f8f9fa;
		border-radius: 4px;
	}
	
	/* Scrollbar styling */
	.pane-content::-webkit-scrollbar {
		width: 8px;
	}
	
	.pane-content::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.pane-content::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.pane-content::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>