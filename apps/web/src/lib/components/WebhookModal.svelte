<script>
	/**
	 * Webhook Modal Component
	 * 
	 * Webhook-specific configuration modal using ThreePanelModal base.
	 * Provides webhook URL configuration, HTTP method selection, headers,
	 * body template, and test functionality.
	 */
	
	import ThreePanelModal from './ThreePanelModal.svelte';
	
	let {
		node,
		onSave,
		onCancel,
		previousNodeOutput = {},
		previousNode = null,
		onRefreshPreviousNode = null,
		onExecuteWorkflow = null,
		isInsideLoop = false  // Will be set by parent when node is inside a loop
	} = $props();
	
	// Local config state
	let config = $state(JSON.parse(JSON.stringify(node.data?.config || {
		url: '',
		method: 'POST',
		headers: '{}',
		bodyTemplate: '',
		description: ''
	})));
	
	/**
	 * Test webhook call with current configuration
	 */
	async function testWebhook(currentConfig, inputData) {
		try {
			// For webhook testing, we'll use the same endpoint as HTTP calls
			// since webhooks are essentially HTTP POST/PUT/PATCH requests
			const response = await fetch('/api/test-http', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					url: currentConfig.url,
					method: currentConfig.method,
					headers: currentConfig.headers,
					body: currentConfig.bodyTemplate,
					inputData  // Pass input data for template interpolation
				})
			});
			
			const data = await response.json();
			
			if (data.success) {
				return {
					success: true,
					response: data.response,
					status: data.status,
					headers: data.headers
				};
			} else {
				return {
					success: false,
					error: data.error?.message || 'Unknown error'
				};
			}
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
	testFunction={testWebhook}
	{isInsideLoop}
>
	{#snippet children(ctx)}
		<div class="modal-header">
			<h2>Configure {ctx.editedNode.data?.label || 'Webhook'}</h2>
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
				<label for="webhook-url">Webhook URL</label>
				<input
					id="webhook-url"
					type="text"
					bind:value={config.url}
					placeholder="https://api.example.com/webhook/{`{{webhookId}}`}"
				/>
				<small class="help-text">Use {`{{variable}}`} syntax for dynamic values</small>
			</div>
			
			<div class="form-group">
				<label for="webhook-method">HTTP Method</label>
				<select
					id="webhook-method"
					bind:value={config.method}
				>
					<option value="POST">POST</option>
					<option value="PUT">PUT</option>
					<option value="PATCH">PATCH</option>
				</select>
			</div>
			
			<div class="form-group">
				<label for="webhook-headers">Headers (JSON)</label>
				<textarea
					id="webhook-headers"
					bind:value={config.headers}
					placeholder={'{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}'}
					rows="4"
					spellcheck="false"
				></textarea>
				<small class="help-text">JSON object with header key-value pairs. Use {`{{variable}}`} for dynamic values</small>
			</div>
			
			<div class="form-group">
				<label for="webhook-body">Body Template</label>
				<textarea
					id="webhook-body"
					bind:value={config.bodyTemplate}
					placeholder={'{\n  "title": "{{title}}",\n  "content": "{{content}}",\n  "user": "{{user.name}}"\n}'}
					rows="8"
					spellcheck="false"
				></textarea>
				<small class="help-text">Use {`{{variable}}`} syntax. Supports nested paths like {`{{user.profile.name}}`}</small>
			</div>
			
			<div class="form-group">
				<label for="webhook-description">Description (optional)</label>
				<input
					id="webhook-description"
					type="text"
					bind:value={config.description}
					placeholder="Webhook description"
				/>
			</div>
		</div>
		
		<div class="modal-footer">
			<button
				class="btn-test"
				onclick={ctx.onTest}
				disabled={ctx.testingOutput || !config.url}
				title={ctx.isInsideLoop ? "Test this webhook with the first item from loop data" : "Test the webhook with current input"}
			>
				{#if ctx.testingOutput}
					<span class="spinner-small"></span>
					Testing...
				{:else}
					{ctx.testButtonLabel}
				{/if}
			</button>
			<button class="btn-secondary" onclick={ctx.onCancel}>Cancel</button>
			<button class="btn-primary" onclick={() => handleSave(ctx.editedNode)}>Save Configuration</button>
		</div>
	{/snippet}
	
	{#snippet outputSnippet(outputProps)}
		{#if outputProps.testingOutput}
			<div class="loading-state">
				<span class="spinner"></span>
				<p>Testing webhook...</p>
			</div>
		{:else if outputProps.testResult}
			{#if outputProps.activeOutputTab === 'preview'}
				<div class="webhook-response-preview">
					{#if outputProps.testResult.success}
						<div class="response-section">
							<h4>Response Status</h4>
							<div class="status-badge status-success">
								{outputProps.testResult.status || 200} OK
							</div>
						</div>
						
						{#if outputProps.testResult.headers}
							<div class="response-section">
								<h4>Response Headers</h4>
								<pre class="response-data">{JSON.stringify(outputProps.testResult.headers, null, 2)}</pre>
							</div>
						{/if}
						
						<div class="response-section">
							<h4>Response Body</h4>
							<pre class="response-data">{typeof outputProps.testResult.response === 'string' 
								? outputProps.testResult.response 
								: JSON.stringify(outputProps.testResult.response, null, 2)}</pre>
						</div>
					{:else}
						<div class="error-state">
							<h4>❌ Webhook Failed</h4>
							<p class="error-message">{outputProps.testResult.error}</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="json-view">
					<pre class="json-display">{JSON.stringify(outputProps.testResult, null, 2)}</pre>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<p>Test the webhook to see the response</p>
				<small>Click "Test Webhook" button to execute</small>
			</div>
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
		line-height: 1.5;
	}
	
	select {
		cursor: pointer;
		background: white;
	}
	
	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #666;
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
		background: #10b981;
		color: white;
		margin-right: auto;
	}
	
	.btn-test:hover:not(:disabled) {
		background: #059669;
	}
	
	.btn-test:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	.spinner-small {
		display: inline-block;
		width: 0.875rem;
		height: 0.875rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	
	.spinner {
		display: inline-block;
		width: 2rem;
		height: 2rem;
		border: 3px solid rgba(0, 0, 0, 0.1);
		border-top-color: var(--color-theme-1, #4075a6);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	/* Output Panel Styles */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		color: #666;
	}
	
	.loading-state p {
		margin: 0;
		font-size: 0.875rem;
	}
	
	.webhook-response-preview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.response-section {
		background: #f8f9fa;
		border-radius: 4px;
		padding: 1rem;
	}
	
	.response-section h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.status-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}
	
	.status-success {
		background: #d1fae5;
		color: #065f46;
	}
	
	.response-data {
		margin: 0;
		padding: 0.75rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		overflow-x: auto;
		color: #333;
	}
	
	.error-state {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		padding: 1rem;
	}
	
	.error-state h4 {
		margin: 0 0 0.5rem 0;
		color: #c00;
		font-size: 0.875rem;
	}
	
	.error-message {
		margin: 0;
		color: #666;
		font-size: 0.875rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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
	
	.json-view {
		height: 100%;
		overflow-y: auto;
	}
	
	.json-display {
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