<script>
	/**
	 * HTTP Call Modal Component
	 *
	 * HTTP-specific configuration modal using ThreePanelModal base.
	 * Provides HTTP method selection, URL configuration, headers, body,
	 * and test functionality with response preview.
	 */
	
	import ThreePanelModal from './ThreePanelModal.svelte';
	import { parseCurl } from '$lib/utils/curl-parser.js';
	
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
		url: '',
		method: 'GET',
		headers: '{}',
		body: '',
		timeout: 30000
	})));
	
	// cURL import state
	let showCurlModal = $state(false);
	let curlInput = $state('');
	let curlError = $state('');
	
	/**
	 * Test HTTP call with current configuration
	 */
	async function testHttpCall(currentConfig, inputData) {
		try {
			const response = await fetch('/api/test-http', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...currentConfig,
					inputData
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
	
	/**
	 * Open cURL import modal
	 */
	function openCurlModal() {
		showCurlModal = true;
		curlInput = '';
		curlError = '';
	}
	
	/**
	 * Close cURL import modal
	 */
	function closeCurlModal() {
		showCurlModal = false;
		curlInput = '';
		curlError = '';
	}
	
	/**
	 * Import cURL command and populate fields
	 */
	function importCurl() {
		try {
			curlError = '';
			const parsed = parseCurl(curlInput);
			
			// Update config with parsed values
			config.url = parsed.url;
			config.method = parsed.method;
			config.headers = JSON.stringify(parsed.headers, null, 2);
			config.body = parsed.body;
			
			// Close modal
			closeCurlModal();
		} catch (err) {
			curlError = err.message;
		}
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
	testFunction={testHttpCall}
>
	{#snippet children(ctx)}
		<div class="modal-header">
			<h2>Configure {ctx.editedNode.data?.label || 'HTTP Call'}</h2>
			<div class="header-actions">
				<button class="btn-import-curl" onclick={openCurlModal} title="Import from cURL">
					📋 Import cURL
				</button>
				<button class="close-btn" onclick={ctx.onCancel} aria-label="Close">&times;</button>
			</div>
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
				<label for="http-method">HTTP Method</label>
				<select
					id="http-method"
					bind:value={config.method}
				>
					<option value="GET">GET</option>
					<option value="POST">POST</option>
					<option value="PUT">PUT</option>
					<option value="DELETE">DELETE</option>
					<option value="PATCH">PATCH</option>
				</select>
			</div>
			
			<div class="form-group">
				<label for="http-url">URL</label>
				<input
					id="http-url"
					type="text"
					bind:value={config.url}
					placeholder="https://api.example.com/users/{`{{userId}}`}"
				/>
				<small class="help-text">Use {`{{variable}}`} syntax for dynamic values</small>
			</div>
			
			<div class="form-group">
				<label for="http-headers">Headers (JSON)</label>
				<textarea
					id="http-headers"
					bind:value={config.headers}
					placeholder={'{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}'}
					rows="4"
					spellcheck="false"
				></textarea>
				<small class="help-text">JSON object with header key-value pairs</small>
			</div>
			
			{#if config.method !== 'GET' && config.method !== 'DELETE'}
				<div class="form-group">
					<label for="http-body">Body (JSON)</label>
					<textarea
						id="http-body"
						bind:value={config.body}
						placeholder={'{"name": "{{user.name}}", "email": "{{user.email}}"}'}
						rows="6"
						spellcheck="false"
					></textarea>
					<small class="help-text">Leave empty to use input data directly</small>
				</div>
			{/if}
			
			<div class="form-group">
				<label for="http-timeout">Timeout (ms)</label>
				<input
					id="http-timeout"
					type="number"
					bind:value={config.timeout}
					placeholder="30000"
					min="1000"
					max="300000"
				/>
				<small class="help-text">Request timeout in milliseconds (1000-300000)</small>
			</div>
		</div>
		
		<div class="modal-footer">
			<button class="btn-test" onclick={ctx.onTest} disabled={ctx.testingOutput || !config.url}>
				{#if ctx.testingOutput}
					<span class="spinner-small"></span>
					Testing...
				{:else}
					🧪 Test Request
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
				<p>Testing HTTP request...</p>
			</div>
		{:else if outputProps.testResult}
			{#if outputProps.activeOutputTab === 'preview'}
				<div class="http-response-preview">
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
							<h4>❌ Request Failed</h4>
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
				<p>Test the HTTP request to see the response</p>
				<small>Click "Test Request" button to execute</small>
			</div>
		{/if}
	{/snippet}
</ThreePanelModal>

<!-- cURL Import Modal -->
{#if showCurlModal}
	<div class="curl-modal-overlay" onclick={closeCurlModal}>
		<div class="curl-modal" onclick={(e) => e.stopPropagation()}>
			<div class="curl-modal-header">
				<h3>Import from cURL</h3>
				<button class="close-btn" onclick={closeCurlModal} aria-label="Close">&times;</button>
			</div>
			
			<div class="curl-modal-body">
				<p class="curl-help-text">
					Paste a cURL command to automatically populate the HTTP request fields.
				</p>
				
				<textarea
					bind:value={curlInput}
					placeholder="curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -d '&#123;&quot;name&quot;:&quot;John&quot;&#125;'"
					rows="8"
					spellcheck="false"
					class="curl-input"
				></textarea>
				
				{#if curlError}
					<div class="curl-error">
						<strong>Error:</strong> {curlError}
					</div>
				{/if}
			</div>
			
			<div class="curl-modal-footer">
				<button class="btn-secondary" onclick={closeCurlModal}>Cancel</button>
				<button class="btn-primary" onclick={importCurl} disabled={!curlInput.trim()}>
					Import
				</button>
			</div>
		</div>
	</div>
{/if}

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
	
	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	
	.btn-import-curl {
		background: #6366f1;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.btn-import-curl:hover {
		background: #4f46e5;
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
	
	.http-response-preview {
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
	
	/* cURL Import Modal Styles */
	.curl-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 1rem;
	}
	
	.curl-modal {
		background: white;
		border-radius: 8px;
		width: 100%;
		max-width: 600px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}
	
	.curl-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.curl-modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}
	
	.curl-modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}
	
	.curl-help-text {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
	}
	
	.curl-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		line-height: 1.5;
		resize: vertical;
		min-height: 150px;
		box-sizing: border-box;
	}
	
	.curl-input:focus {
		outline: none;
		border-color: var(--color-theme-1, #4075a6);
	}
	
	.curl-error {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #c00;
	}
	
	.curl-error strong {
		font-weight: 600;
	}
	
	.curl-modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}
	
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>