<script>
	import HttpResponseViewer from './HttpResponseViewer.svelte';
	import VariablePickerTemplate from './VariablePickerTemplate.svelte';
	
	let { node, onSave, onCancel, previousNodeOutput = {}, previousNode = null, onRefreshPreviousNode = null } = $props();
	
	// Local state for editing - deep clone to avoid immutability
	let editedNode = $state(JSON.parse(JSON.stringify(node)));
	let config = $state(JSON.parse(JSON.stringify(node.data?.config || {})));
	
	// HTTP test state
	let testing = $state(false);
	let testResult = $state(null);
	let showTestResult = $state(false);
	
	// Previous node test state
	let testingPreviousNode = $state(false);
	let refreshedOutput = $state(null);
	let hasExecutedPreviousNode = $state(false);
	
	// Node type configurations
	const nodeConfigs = {
		httpCall: {
			fields: [
				{ name: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://api.example.com/endpoint' },
				{ name: 'method', label: 'Method', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
				{ name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
				{ name: 'body', label: 'Body (JSON)', type: 'textarea', placeholder: '{"key": "value"}' },
				{ name: 'timeout', label: 'Timeout (ms)', type: 'number', placeholder: '30000' }
			]
		},
		transform: {
			fields: [
				{ name: 'template', label: 'Template', type: 'template-picker', required: true },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Transform description' }
			]
		},
		delay: {
			fields: [
				{ name: 'duration', label: 'Duration (ms)', type: 'number', required: true, placeholder: '1000' },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Delay description' }
			]
		},
		conditional: {
			fields: [
				{ name: 'condition', label: 'Condition (JMESPath)', type: 'textarea', required: true, placeholder: 'status == `success`' },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Condition description' }
			]
		},
		branch: {
			fields: [
				{ name: 'branches', label: 'Number of Branches', type: 'number', required: true, placeholder: '2', min: 2, max: 10 },
				{ name: 'strategy', label: 'Branch Strategy', type: 'select', required: true, options: ['parallel', 'sequential'] },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Branch description (e.g., "Broadcast to Discord and Slack")' }
			]
		},
		loop: {
			fields: [
				{ name: 'items', label: 'Items Expression (JMESPath)', type: 'textarea', required: true, placeholder: 'data.items[*]' },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Loop description' }
			]
		},
		webhook: {
			fields: [
				{ name: 'url', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://api.example.com/webhook' },
				{ name: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['POST', 'PUT', 'PATCH'] },
				{ name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json", "Authorization": "Bearer {{token}}"}' },
				{ name: 'bodyTemplate', label: 'Body Template', type: 'textarea', required: true, placeholder: '{\n  "title": "{{title}}",\n  "content": "{{content}}",\n  "timestamp": "{{timestamp}}"\n}', rows: 8 },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Webhook description' }
			]
		},
		schedule: {
			fields: [
				{ name: 'cron', label: 'Cron Expression', type: 'text', required: true, placeholder: '0 0 * * *' },
				{ name: 'timezone', label: 'Timezone', type: 'text', placeholder: 'America/Los_Angeles' },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Schedule description' }
			]
		},
		terminate: {
			fields: [
				{ name: 'reason', label: 'Termination Reason', type: 'text', placeholder: 'Workflow completed' },
				{ name: 'status', label: 'Status', type: 'select', options: ['success', 'failure', 'cancelled'] }
			]
		}
	};
	
	const currentConfig = nodeConfigs[editedNode.data?.type] || { fields: [] };
	
	function handleSave() {
		// Update the node with new configuration
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
	
	/**
	 * Test HTTP call configuration
	 */
	async function handleTestHttpCall() {
		testing = true;
		testResult = null;
		showTestResult = false;
		
		try {
			const response = await fetch('/api/test-http', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(config)
			});
			
			const data = await response.json();
			
			if (data.success) {
				testResult = {
					response: data.response,
					request: data.request,
					error: null
				};
			} else {
				testResult = {
					response: null,
					request: data.request,
					error: data.error
				};
			}
			
			showTestResult = true;
		} catch (err) {
			testResult = {
				response: null,
				request: null,
				error: {
					message: err.message || 'Failed to test HTTP call',
					name: 'NetworkError'
				}
			};
			showTestResult = true;
		} finally {
			testing = false;
		}
	}
	
	/**
	 * Close test result viewer
	 */
	function closeTestResult() {
		showTestResult = false;
	}
	
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
	
	// Use refreshed output if available, otherwise use the passed previousNodeOutput
	// Create a mutable copy to avoid Svelte 5 immutability errors with SES
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
</script>

<div class="modal-overlay" onclick={handleOverlayClick} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="dialog" aria-modal="true" tabindex="-1">
	<div class="modal-content" class:transform-modal={editedNode.data?.type === 'transform'}>
		<div class="modal-header">
			<h2>Configure {editedNode.data?.label || 'Node'}</h2>
			<button class="close-btn" onclick={handleCancel} aria-label="Close">&times;</button>
		</div>
		
		{#if editedNode.data?.type === 'transform'}
			<!-- Transform Node: Three-panel n8n-style layout -->
			<div class="transform-layout">
				<!-- Left Panel: Input -->
				<div class="transform-panel input-panel">
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
							<div class="empty-input">
								<p>No input data available</p>
								<small>Connect a previous node to see input</small>
							</div>
						{/if}
					</div>
				</div>
				
				<!-- Middle Panel: Configuration -->
				<div class="transform-panel config-panel">
					<div class="panel-header">
						<h3>Configuration</h3>
					</div>
					<div class="panel-content">
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
				</div>
				
				<!-- Right Panel: Output Preview -->
				<div class="transform-panel output-panel">
					<div class="panel-header">
						<h3>Output</h3>
					</div>
					<div class="panel-content">
						{#if !config.template}
							<div class="empty-output">
								<p>Output preview will appear here</p>
								<small>Start typing in the template editor</small>
							</div>
						{:else if !hasExecutedPreviousNode && Object.keys(currentPreviousOutput).length === 0}
							<div class="empty-output">
								<p>Execute previous node to see output</p>
								<small>Click "Execute Previous Node" in the input panel</small>
							</div>
						{:else}
							<pre class="output-preview">{processTemplate(config.template, currentPreviousOutput)}</pre>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Standard Node Configuration -->
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
				
				{#each currentConfig.fields as field}
					<div class="form-group" class:full-width={field.type === 'template-picker'}>
						{#if field.type === 'template-picker'}
							{#if previousNode && previousNode.data?.type === 'httpCall'}
								<div class="previous-node-actions">
									<button
										class="btn-refresh-previous"
										onclick={handleTestPreviousNode}
										disabled={testingPreviousNode}
										title="Re-test the previous HTTP call to get fresh data"
									>
										{#if testingPreviousNode}
											<span class="spinner"></span>
											Testing Previous Node...
										{:else}
											🔄 Refresh Previous Node Data
										{/if}
									</button>
								</div>
							{/if}
							<VariablePickerTemplate
								previousNodeOutput={currentPreviousOutput}
								bind:template={config[field.name]}
								onTemplateChange={(newTemplate) => {
									config[field.name] = newTemplate;
								}}
							/>
						{:else}
							<label for={field.name}>
								{field.label}
								{#if field.required}<span class="required">*</span>{/if}
							</label>
							
							{#if field.type === 'text' || field.type === 'number'}
								<input
									id={field.name}
									type={field.type}
									bind:value={config[field.name]}
									placeholder={field.placeholder || ''}
									required={field.required}
									min={field.min}
									max={field.max}
								/>
							{:else if field.type === 'textarea'}
								<textarea
									id={field.name}
									bind:value={config[field.name]}
									placeholder={field.placeholder || ''}
									required={field.required}
									rows={field.rows || 4}
								></textarea>
							{:else if field.type === 'select'}
								<select id={field.name} bind:value={config[field.name]} required={field.required}>
									<option value="">Select {field.label}</option>
									{#each field.options as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}
		
		<div class="modal-footer">
			<div class="footer-left">
				{#if editedNode.data?.type === 'httpCall'}
					<button
						class="btn-test"
						onclick={handleTestHttpCall}
						disabled={testing || !config.url}
						title="Test this HTTP call configuration"
					>
						{#if testing}
							<span class="spinner"></span>
							Testing...
						{:else}
							🧪 Test Request
						{/if}
					</button>
				{/if}
			</div>
			<div class="footer-right">
				<button class="btn-secondary" onclick={handleCancel}>Cancel</button>
				<button class="btn-primary" onclick={handleSave}>Save Configuration</button>
			</div>
		</div>
	</div>
</div>

{#if showTestResult && testResult}
	<div class="test-result-overlay" onclick={closeTestResult} onkeydown={(e) => e.key === 'Escape' && closeTestResult()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="test-result-modal" onclick={(e) => e.stopPropagation()} role="document">
			<div class="test-result-header">
				<h2>HTTP Test Result</h2>
				<button class="close-btn" onclick={closeTestResult} aria-label="Close">&times;</button>
			</div>
			<div class="test-result-body">
				<HttpResponseViewer
					response={testResult.response}
					request={testResult.request}
					error={testResult.error}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
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
	}
	
	.modal-content {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		width: 90%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
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
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	.form-group:last-child {
		margin-bottom: 0;
	}
	
	.form-group.full-width {
		margin-bottom: 0;
	}
	
	.previous-node-actions {
		margin-bottom: 1rem;
		display: flex;
		justify-content: flex-end;
	}
	
	.btn-refresh-previous {
		background: #10b981;
		color: white;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-refresh-previous:hover:not(:disabled) {
		background: #059669;
	}
	
	.btn-refresh-previous:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}
	
	.required {
		color: #e53e3e;
		margin-left: 0.25rem;
	}
	
	input,
	textarea,
	select {
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
	textarea:focus,
	select:focus {
		outline: none;
		border-color: var(--color-theme-1, #4075a6);
	}
	
	textarea {
		resize: vertical;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}
	
	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}
	
	.footer-left {
		display: flex;
		gap: 0.5rem;
	}
	
	.footer-right {
		display: flex;
		gap: 1rem;
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
	
	.btn-test {
		background: #8b5cf6;
		color: white;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.btn-test:hover:not(:disabled) {
		background: #7c3aed;
	}
	
	.btn-test:disabled {
		opacity: 0.6;
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
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.test-result-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
	}
	
	.test-result-modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		width: 90%;
		max-width: 900px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
	}
	
	.test-result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.test-result-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}
	
	.test-result-body {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>