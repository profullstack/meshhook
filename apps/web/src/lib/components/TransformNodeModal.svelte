<script>
	/**
	 * Transform Node Modal Component
	 * 
	 * Transform-specific configuration modal using ThreePanelModal base.
	 * Provides template editor with variable substitution and real-time preview.
	 */
	
	import ThreePanelModal from './ThreePanelModal.svelte';
	
	let {
		node,
		onSave,
		onCancel,
		previousNodeOutput = {},
		previousNode = null,
		onRefreshPreviousNode = null,
		onExecuteWorkflow = null
	} = $props();
	
	// Local config state
	let config = $state(JSON.parse(JSON.stringify(node.data?.config || {
		template: '',
		description: ''
	})));
	
	/**
	 * Process template with variable substitution for preview
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
	 * Test transform - just process the template with current input
	 */
	async function testTransform(currentConfig, inputData) {
		try {
			const result = processTemplate(currentConfig.template, inputData);
			return {
				success: true,
				output: result,
				preview: result
			};
		} catch (err) {
			return {
				success: false,
				error: err.message
			};
		}
	}
	
	/**
	 * Handle save
	 */
	function handleSave(editedNode) {
		const updatedNode = {
			...editedNode,
			data: {
				...editedNode.data,
				config
			}
		};
		onSave(updatedNode);
	}
</script>

<ThreePanelModal
	{node}
	{onSave}
	{onCancel}
	{previousNodeOutput}
	{previousNode}
	{onRefreshPreviousNode}
	{onExecuteWorkflow}
	inputRequired={false}
	showInputPanel={true}
	showOutputPanel={true}
	testFunction={testTransform}
>
	{#snippet children(ctx)}
		<div class="modal-header">
			<h2>Configure {ctx.editedNode.data?.label || 'Transform Node'}</h2>
			<button class="close-btn" onclick={ctx.onCancel} aria-label="Close">&times;</button>
		</div>
		
		<div class="modal-body">
			<div class="form-group">
				<label for="node-label">Node Label</label>
				<input
					id="node-label"
					type="text"
					bind:value={ctx.editedNode.data.label}
					placeholder="Enter node label"
				/>
			</div>
			
			<div class="form-group">
				<label for="template">Template</label>
				<textarea
					id="template"
					bind:value={config.template}
					placeholder="Enter your template here...&#10;&#10;Example:&#10;Hello {'{{name}}'}!&#10;Your order #{'{{order.id}}'} is {'{{status}}'}."
					rows="15"
					spellcheck="false"
					ondrop={(e) => {
						e.preventDefault();
						const variable = e.dataTransfer.getData('text/plain');
						if (variable && e.target instanceof HTMLTextAreaElement) {
							const textarea = e.target;
							const start = textarea.selectionStart;
							const end = textarea.selectionEnd;
							const text = config.template || '';
							config.template = text.substring(0, start) + variable + text.substring(end);
							
							// Set cursor position after inserted variable
							setTimeout(() => {
								textarea.focus();
								const newPos = start + variable.length;
								textarea.setSelectionRange(newPos, newPos);
							}, 0);
						}
					}}
					ondragover={(e) => e.preventDefault()}
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
						<p class="help-note">💡 Tip: Click variables in the input panel or drag them into the template editor</p>
					</details>
				</div>
			</div>
			
			<div class="form-group">
				<label for="description">Description (optional)</label>
				<input
					id="description"
					type="text"
					bind:value={config.description}
					placeholder="Transform description"
				/>
			</div>
		</div>
		
		<div class="modal-footer">
			<button class="btn-secondary" onclick={ctx.onCancel}>Cancel</button>
			<button class="btn-primary" onclick={() => handleSave(ctx.editedNode)}>Save Configuration</button>
		</div>
	{/snippet}
	
	{#snippet outputSnippet(outputProps)}
		{#if !config.template}
			<div class="empty-state">
				<p>Output preview will appear here</p>
				<small>Start typing in the template editor</small>
			</div>
		{:else if !outputProps.currentPreviousOutput || Object.keys(outputProps.currentPreviousOutput).length === 0}
			<div class="empty-state">
				<p>Execute workflow to see output</p>
				<small>Click "Execute Workflow" in the input panel</small>
			</div>
		{:else}
			<pre class="output-preview">{processTemplate(config.template, outputProps.currentPreviousOutput)}</pre>
		{/if}
	{/snippet}
</ThreePanelModal>

<style>
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}
	
	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: background 0.2s;
	}
	
	.close-btn:hover {
		background: #f5f5f5;
	}
	
	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	.form-group:last-child {
		margin-bottom: 0;
	}
	
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}
	
	input,
	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}
	
	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-theme-1, #4075a6);
	}
	
	textarea {
		resize: vertical;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		line-height: 1.5;
	}
	
	.template-help {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 4px;
		font-size: 0.75rem;
	}
	
	.template-help summary {
		cursor: pointer;
		color: #666;
		user-select: none;
		font-weight: 500;
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
	
	.help-note {
		margin: 0.75rem 0 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid #e0e0e0;
		color: #666;
		font-style: italic;
	}
	
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}
	
	button {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-primary {
		background: var(--color-theme-1, #4075a6);
		color: white;
	}
	
	.btn-primary:hover {
		background: var(--color-theme-2, #305a7a);
	}
	
	.btn-secondary {
		background: white;
		color: #333;
		border: 1px solid #ddd;
	}
	
	.btn-secondary:hover {
		background: #f5f5f5;
	}
	
	/* Output Panel */
	.output-preview {
		margin: 0;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
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
	
	/* Scrollbar styling */
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}
	
	.modal-body::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.modal-body::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.modal-body::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>