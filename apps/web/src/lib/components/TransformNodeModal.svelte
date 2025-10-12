<script>
	/**
	 * Transform Node Modal Component
	 * 
	 * Three-panel n8n-style layout:
	 * - Left: Input data from previous node
	 * - Center: Configuration (modal)
	 * - Right: Output preview
	 */
	
	let {
		node,
		onSave,
		onCancel,
		previousNodeOutput = {},
		previousNode = null,
		onRefreshPreviousNode = null
	} = $props();
	
	// Local state for editing
	let editedNode = $state(JSON.parse(JSON.stringify(node)));
	let config = $state(JSON.parse(JSON.stringify(node.data?.config || {})));
	
	// Previous node test state
	let testingPreviousNode = $state(false);
	let refreshedOutput = $state(null);
	let hasExecutedPreviousNode = $state(false);
	
	// Current previous output
	let currentPreviousOutput = $state({});
	
	// Update currentPreviousOutput when dependencies change
	$effect(() => {
		currentPreviousOutput = refreshedOutput
			? JSON.parse(JSON.stringify(refreshedOutput))
			: previousNodeOutput
				? JSON.parse(JSON.stringify(previousNodeOutput))
				: {};
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
	
	function handleSave() {
		const updatedNode = {
			...editedNode,
			data: {
				...editedNode.data,
				config
			}
		};
		onSave(updatedNode);
	}
	
	function handleCancel() {
		onCancel();
	}
	
	function handleOverlayClick(event) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

<div class="transform-modal-overlay" onclick={handleOverlayClick} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="dialog" aria-modal="true" tabindex="-1">
	<div class="transform-modal-container">
		<!-- Left Panel: Input -->
		<div class="side-panel input-panel">
			<div class="panel-header">
				<h3>Input</h3>
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
					<div class="input-data">
						<div class="data-header">
							<span class="data-label">Previous Node Output</span>
							{#if previousNode && previousNode.data?.type === 'httpCall'}
								<button
									class="btn-refresh-small"
									onclick={handleTestPreviousNode}
									disabled={testingPreviousNode}
									title="Re-execute previous node"
								>
									{#if testingPreviousNode}
										<span class="spinner-small"></span>
									{:else}
										🔄
									{/if}
								</button>
							{/if}
						</div>
						<pre class="json-display">{JSON.stringify(currentPreviousOutput, null, 2)}</pre>
					</div>
				{:else}
					<div class="empty-state">
						<p>No input data available</p>
						<small>Connect a previous node to see input</small>
					</div>
				{/if}
			</div>
		</div>
		
		<!-- Center: Configuration Modal -->
		<div class="center-modal">
			<div class="modal-header">
				<h2>Configure {editedNode.data?.label || 'Transform Node'}</h2>
				<button class="close-btn" onclick={handleCancel} aria-label="Close">&times;</button>
			</div>
			
			<div class="modal-body">
				<div class="form-group">
					<label for="node-label">Node Label</label>
					<input
						id="node-label"
						type="text"
						bind:value={editedNode.data.label}
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
				<button class="btn-secondary" onclick={handleCancel}>Cancel</button>
				<button class="btn-primary" onclick={handleSave}>Save Configuration</button>
			</div>
		</div>
		
		<!-- Right Panel: Output Preview -->
		<div class="side-panel output-panel">
			<div class="panel-header">
				<h3>Output</h3>
			</div>
			<div class="panel-content">
				{#if !config.template}
					<div class="empty-state">
						<p>Output preview will appear here</p>
						<small>Start typing in the template editor</small>
					</div>
				{:else if !hasExecutedPreviousNode && Object.keys(currentPreviousOutput).length === 0}
					<div class="empty-state">
						<p>Execute previous node to see output</p>
						<small>Click "Execute Previous Node" in the input panel</small>
					</div>
				{:else}
					<pre class="output-preview">{processTemplate(config.template, currentPreviousOutput)}</pre>
				{/if}
			</div>
		</div>
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
		grid-template-columns: 350px 1fr 350px;
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
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
		background: #f8f9fa;
	}
	
	.panel-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
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
	
	.input-data {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	
	.data-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.data-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
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
	
	/* Scrollbar styling */
	.panel-content::-webkit-scrollbar,
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}
	
	.panel-content::-webkit-scrollbar-track,
	.modal-body::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.panel-content::-webkit-scrollbar-thumb,
	.modal-body::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.panel-content::-webkit-scrollbar-thumb:hover,
	.modal-body::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>