<script>
	/**
	 * XML/JSON Transform Node Modal Component
	 * 
	 * Configuration modal for XML<->JSON transformation node.
	 * Auto-detects input format and converts between XML and JSON.
	 * Perfect for parsing RSS feeds to send to webhooks.
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
		description: 'Transform between XML and JSON formats',
		ignoreAttributes: false,
		attributeNamePrefix: '@_'
	})));
	
	/**
	 * Detect if input is XML
	 */
	function isXml(input) {
		if (typeof input !== 'string') return false;
		const trimmed = input.trim();
		return trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>'));
	}
	
	/**
	 * Detect if input is JSON
	 */
	function isJson(input) {
		if (typeof input === 'object' && input !== null) return true;
		if (typeof input === 'string') {
			const trimmed = input.trim();
			if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
				try {
					JSON.parse(trimmed);
					return true;
				} catch {
					return false;
				}
			}
		}
		return false;
	}
	
	/**
	 * Test transform by calling the backend API
	 */
	async function testTransform(currentConfig, inputData) {
		try {
			// Detect format
			const inputIsXml = isXml(inputData);
			const inputIsJson = isJson(inputData);
			
			if (!inputIsXml && !inputIsJson) {
				return {
					success: false,
					error: 'Input must be valid XML or JSON'
				};
			}
			
			// Call backend API to perform transformation
			const response = await fetch('/api/test-transform-xml-json', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					input: inputData,
					config: currentConfig
				})
			});
			
			if (!response.ok) {
				const error = await response.json();
				return {
					success: false,
					error: error.message || 'Transform failed'
				};
			}
			
			const result = await response.json();
			
			return {
				success: true,
				output: result.output,
				preview: typeof result.output === 'object' 
					? JSON.stringify(result.output, null, 2)
					: result.output,
				detectedFormat: inputIsXml ? 'XML' : 'JSON',
				outputFormat: inputIsXml ? 'JSON' : 'XML'
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
			<h2>Configure {ctx.editedNode.data?.label || 'XML/JSON Transform'}</h2>
			<button class="close-btn" onclick={ctx.onCancel} aria-label="Close">&times;</button>
		</div>
		
		<div class="modal-body">
			<div class="info-banner">
				<div class="info-icon">ℹ️</div>
				<div class="info-content">
					<strong>Auto-Detection Transform</strong>
					<p>This node automatically detects whether the input is XML or JSON and converts it to the opposite format. Perfect for parsing RSS/Atom feeds!</p>
				</div>
			</div>
			
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
				<label for="description">Description (optional)</label>
				<input
					id="description"
					type="text"
					bind:value={config.description}
					placeholder="Transform description"
				/>
			</div>
			
			<details class="advanced-options">
				<summary>Advanced Options</summary>
				
				<div class="form-group">
					<label class="checkbox-label">
						<input
							type="checkbox"
							bind:checked={config.ignoreAttributes}
						/>
						<span>Ignore XML Attributes</span>
					</label>
					<small class="help-text">When enabled, XML attributes will not be included in the JSON output</small>
				</div>
				
				<div class="form-group">
					<label for="attribute-prefix">Attribute Name Prefix</label>
					<input
						id="attribute-prefix"
						type="text"
						bind:value={config.attributeNamePrefix}
						placeholder="@_"
						disabled={config.ignoreAttributes}
					/>
					<small class="help-text">Prefix for XML attribute names in JSON (e.g., @_ makes id become @_id)</small>
				</div>
			</details>
			
			<div class="examples">
				<h3>Examples</h3>
				
				<div class="example">
					<h4>XML to JSON</h4>
					<div class="example-code">
						<strong>Input (XML):</strong>
						<pre>&lt;user&gt;&lt;name&gt;Alice&lt;/name&gt;&lt;age&gt;30&lt;/age&gt;&lt;/user&gt;</pre>
						<strong>Output (JSON):</strong>
						<pre>{'{ "user": { "name": "Alice", "age": 30 } }'}</pre>
					</div>
				</div>
				
				<div class="example">
					<h4>JSON to XML</h4>
					<div class="example-code">
						<strong>Input (JSON):</strong>
						<pre>{'{ "user": { "name": "Bob", "age": 25 } }'}</pre>
						<strong>Output (XML):</strong>
						<pre>&lt;user&gt;&lt;name&gt;Bob&lt;/name&gt;&lt;age&gt;25&lt;/age&gt;&lt;/user&gt;</pre>
					</div>
				</div>
				
				<div class="example">
					<h4>RSS Feed Parsing</h4>
					<div class="example-code">
						<strong>Input (RSS XML):</strong>
						<pre>&lt;rss&gt;&lt;channel&gt;&lt;item&gt;&lt;title&gt;Post&lt;/title&gt;&lt;/item&gt;&lt;/channel&gt;&lt;/rss&gt;</pre>
						<strong>Output (JSON):</strong>
						<pre>{'{ "rss": { "channel": { "item": { "title": "Post" } } } }'}</pre>
					</div>
				</div>
			</div>
		</div>
		
		<div class="modal-footer">
			<button class="btn-secondary" onclick={ctx.onCancel}>Cancel</button>
			<button class="btn-primary" onclick={() => handleSave(ctx.editedNode)}>Save Configuration</button>
		</div>
	{/snippet}
	
	{#snippet outputSnippet(outputProps)}
		{#if !outputProps.currentPreviousOutput || Object.keys(outputProps.currentPreviousOutput).length === 0}
			<div class="empty-state">
				<p>Output preview will appear here</p>
				<small>Execute workflow to see the transformation</small>
			</div>
		{:else}
			{@const inputData = outputProps.currentPreviousOutput}
			{@const inputIsXml = isXml(inputData)}
			{@const inputIsJson = isJson(inputData)}
			
			{#if !inputIsXml && !inputIsJson}
				<div class="error-state">
					<p>❌ Invalid Input</p>
					<pre class="error-message">Input must be valid XML or JSON</pre>
				</div>
			{:else}
				{@const detectedFormat = inputIsXml ? 'XML' : 'JSON'}
				{@const outputFormat = inputIsXml ? 'JSON' : 'XML'}
				
				<div class="transform-info">
					<span class="format-badge">{detectedFormat}</span>
					<span class="arrow">→</span>
					<span class="format-badge">{outputFormat}</span>
				</div>
				
				{#await testTransform(config, inputData)}
					<div class="empty-state">
						<p>Transforming...</p>
					</div>
				{:then result}
					{#if result.success}
						<pre class="output-preview">{result.preview}</pre>
					{:else}
						<div class="error-state">
							<p>❌ Transform Error</p>
							<pre class="error-message">{result.error}</pre>
						</div>
					{/if}
				{:catch error}
					<div class="error-state">
						<p>❌ Transform Error</p>
						<pre class="error-message">{error.message}</pre>
					</div>
				{/await}
			{/if}
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
	
	.info-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #e3f2fd;
		border-left: 4px solid #2196f3;
		border-radius: 4px;
		margin-bottom: 1.5rem;
	}
	
	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	
	.info-content {
		flex: 1;
	}
	
	.info-content strong {
		display: block;
		margin-bottom: 0.25rem;
		color: #1976d2;
	}
	
	.info-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #555;
		line-height: 1.5;
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
	
	input[type="text"] {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}
	
	input[type="text"]:focus {
		outline: none;
		border-color: var(--color-theme-1, #4075a6);
	}
	
	input[type="text"]:disabled {
		background: #f5f5f5;
		color: #999;
		cursor: not-allowed;
	}
	
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-weight: normal;
	}
	
	input[type="checkbox"] {
		width: auto;
		cursor: pointer;
	}
	
	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #666;
	}
	
	.advanced-options {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 4px;
	}
	
	.advanced-options summary {
		cursor: pointer;
		font-weight: 500;
		color: #666;
		user-select: none;
		margin-bottom: 1rem;
	}
	
	.advanced-options summary:hover {
		color: #333;
	}
	
	.advanced-options[open] summary {
		margin-bottom: 1rem;
	}
	
	.examples {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e0e0e0;
	}
	
	.examples h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}
	
	.example {
		margin-bottom: 1.5rem;
	}
	
	.example:last-child {
		margin-bottom: 0;
	}
	
	.example h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #666;
	}
	
	.example-code {
		background: #f8f9fa;
		padding: 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
	
	.example-code strong {
		display: block;
		margin-bottom: 0.25rem;
		color: #333;
	}
	
	.example-code pre {
		margin: 0 0 0.75rem 0;
		padding: 0.5rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 2px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.7rem;
		line-height: 1.4;
		overflow-x: auto;
	}
	
	.example-code pre:last-child {
		margin-bottom: 0;
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
	.transform-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}
	
	.format-badge {
		padding: 0.25rem 0.75rem;
		background: var(--color-theme-1, #4075a6);
		color: white;
		border-radius: 12px;
		font-weight: 500;
		font-size: 0.75rem;
	}
	
	.arrow {
		color: #666;
		font-weight: bold;
	}
	
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
		max-height: 400px;
		overflow-y: auto;
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
	
	.error-state {
		padding: 1rem;
		background: #ffebee;
		border-left: 4px solid #f44336;
		border-radius: 4px;
	}
	
	.error-state p {
		margin: 0 0 0.5rem 0;
		font-weight: 500;
		color: #c62828;
	}
	
	.error-message {
		margin: 0;
		padding: 0.75rem;
		background: white;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		color: #c62828;
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	
	/* Scrollbar styling */
	.modal-body::-webkit-scrollbar,
	.output-preview::-webkit-scrollbar {
		width: 8px;
	}
	
	.modal-body::-webkit-scrollbar-track,
	.output-preview::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.modal-body::-webkit-scrollbar-thumb,
	.output-preview::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.modal-body::-webkit-scrollbar-thumb:hover,
	.output-preview::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>