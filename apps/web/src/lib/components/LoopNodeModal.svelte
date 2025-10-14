<script>
	/**
	 * Loop Node Modal Component
	 * 
	 * Loop-specific configuration modal using ThreePanelModal base.
	 * Provides JMESPath expression editor with input visualization and loop preview.
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
		items: '',
		description: ''
	})));
	
	// JMESPath help modal state
	let showJMESPathHelp = $state(false);
	
	/**
	 * Open JMESPath help modal
	 */
	function openJMESPathHelp() {
		showJMESPathHelp = true;
	}
	
	/**
	 * Close JMESPath help modal
	 */
	function closeJMESPathHelp() {
		showJMESPathHelp = false;
	}
	
	// Track if we're currently testing to prevent double execution
	let isTesting = false;
	
	/**
	 * Test loop expression - evaluate JMESPath and show results
	 */
	async function testLoop(currentConfig, inputData) {
		// Prevent double execution
		if (isTesting) {
			console.log('Test already in progress, skipping duplicate call');
			return { success: false, error: 'Test already in progress' };
		}
		
		isTesting = true;
		
		try {
			console.log('=== LoopNodeModal testLoop ===');
			console.log('Config:', JSON.stringify(currentConfig, null, 2));
			console.log('Input data type:', typeof inputData);
			console.log('Input data:', JSON.stringify(inputData, null, 2));
			console.log('Input is empty?', !inputData || Object.keys(inputData).length === 0);
			console.log('=============================');
			
			const response = await fetch('/api/test-loop', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					config: currentConfig,
					input: inputData
				})
			});
			
			const data = await response.json();
			
			console.log('=== Loop API Response ===');
			console.log('Success:', data.success);
			console.log('Output:', data.output);
			console.log('Count:', data.count);
			console.log('Preview:', data.preview);
			console.log('Error:', data.error);
			console.log('========================');
			
			if (data.success) {
				return {
					success: true,
					output: data.output,
					count: data.count,
					preview: data.preview
				};
			} else {
				return {
					success: false,
					error: data.error?.message || data.error || 'Unknown error'
				};
			}
		} catch (err) {
			console.error('Loop test error:', err);
			return {
				success: false,
				error: err.message
			};
		} finally {
			isTesting = false;
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
	inputRequired={true}
	showInputPanel={true}
	showOutputPanel={true}
	testFunction={testLoop}
>
	{#snippet children(ctx)}
		<div class="modal-header">
			<h2>Configure {ctx.editedNode.data?.label || 'Loop Node'}</h2>
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
				<label for="items-expression">
					Items Expression (JMESPath)
					<button
						type="button"
						class="help-icon-btn"
						onclick={openJMESPathHelp}
						title="View JMESPath syntax help"
						aria-label="JMESPath syntax help"
					>
						?
					</button>
					<span class="required">*</span>
				</label>
				<textarea
					id="items-expression"
					bind:value={config.items}
					placeholder="data.items[*]&#10;&#10;Examples:&#10;items[*]&#10;data.users[?active == `true`]&#10;products[?price > `10`]"
					rows="6"
					spellcheck="false"
				></textarea>
				<small class="help-text">JMESPath expression that returns an array to loop over</small>
			</div>
			
			<div class="form-group">
				<label for="description">Description (optional)</label>
				<input
					id="description"
					type="text"
					bind:value={config.description}
					placeholder="Loop description"
				/>
			</div>
			
			<div class="info-box">
				<div class="info-icon">ℹ️</div>
				<div class="info-content">
					<strong>How Loop Works:</strong>
					<p>The loop node will execute the following nodes once for each item in the array returned by your expression. Each iteration receives one item as input.</p>
				</div>
			</div>
		</div>
		
		<div class="modal-footer">
			<button class="btn-test" onclick={ctx.onTest} disabled={ctx.testingOutput || !config.items}>
				{#if ctx.testingOutput}
					<span class="spinner-small"></span>
					Testing...
				{:else}
					🧪 Test Expression
				{/if}
			</button>
			<button class="btn-secondary" onclick={ctx.onCancel}>Cancel</button>
			<button class="btn-primary" onclick={() => handleSave(ctx.editedNode)}>Save Configuration</button>
		</div>
	{/snippet}
	
	{#snippet outputSnippet(outputProps)}
		{#if !config.items}
			<div class="empty-state">
				<p>Output preview will appear here</p>
				<small>Enter a JMESPath expression and test</small>
			</div>
		{:else if outputProps.testResult}
			{#if outputProps.testResult.success}
				<div class="loop-preview">
					<div class="preview-header">
						<h4>Output Per Iteration</h4>
						<div class="item-count">
							{outputProps.testResult.count} {outputProps.testResult.count === 1 ? 'iteration' : 'iterations'}
						</div>
					</div>
					
					{#if outputProps.testResult.count > 0}
						<div class="preview-items">
							<p class="preview-note">Each iteration will receive one item. Showing first item as example:</p>
							<div class="preview-item">
								<div class="item-header">
									<span class="item-number">Item 1 (Example Output)</span>
								</div>
								<pre class="item-content">{typeof outputProps.testResult.preview[0] === 'object' ? JSON.stringify(outputProps.testResult.preview[0], null, 2) : String(outputProps.testResult.preview[0])}</pre>
							</div>
							{#if outputProps.testResult.count > 1}
								<div class="more-items">
									The loop will execute {outputProps.testResult.count - 1} more time{outputProps.testResult.count === 2 ? '' : 's'} with the remaining items
								</div>
							{/if}
						</div>
					{:else}
						<div class="empty-result">
							<p>Expression returned an empty array</p>
							<small>No items to loop over</small>
						</div>
					{/if}
				</div>
			{:else}
				<div class="error-state">
					<h4>❌ Expression Error</h4>
					<p class="error-message">{outputProps.testResult.error}</p>
					<small class="error-hint">Check the browser console for details</small>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<p>Click "Test Expression" to preview loop items</p>
			</div>
		{/if}
	{/snippet}
</ThreePanelModal>

<!-- JMESPath Help Modal -->
{#if showJMESPathHelp}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="help-modal-overlay" onclick={closeJMESPathHelp} onkeydown={(e) => e.key === 'Escape' && closeJMESPathHelp()} role="dialog" aria-modal="true" tabindex="-1">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="help-modal" onclick={(e) => e.stopPropagation()}>
			<div class="help-modal-header">
				<h3>JMESPath Syntax Reference</h3>
				<button class="close-btn" onclick={closeJMESPathHelp} aria-label="Close">&times;</button>
			</div>
			
			<div class="help-modal-body">
				<div class="help-section">
					<h4>Basic Syntax</h4>
					<ul>
						<li><code>property</code> - Access property</li>
						<li><code>parent.child</code> - Nested property</li>
						<li><code>array[0]</code> - Array element</li>
						<li><code>array[*]</code> - All elements</li>
						<li><code>array[*].property</code> - Project property from all items</li>
					</ul>
				</div>
				
				<div class="help-section">
					<h4>Filtering</h4>
					<ul>
						<li><code>array[?condition]</code> - Filter array</li>
						<li><code>items[?price > `10`]</code> - Filter by comparison</li>
						<li><code>users[?active == `true`]</code> - Filter by equality</li>
						<li><code>items[?price > `10` && stock > `0`]</code> - Multiple conditions</li>
					</ul>
					<p class="help-note-small">💡 Use backticks for string literals: <code>`string`</code></p>
				</div>
				
				<div class="help-section">
					<h4>Loop Node Examples</h4>
					<pre class="help-example">data.items[*]

items[?price > `10`]

users[?active == `true`]

products | sort_by(@, &price)

data.orders[?status == `pending`]</pre>
				</div>
				
				<p class="help-note">
					📚 <strong>Full Documentation:</strong> See <a href="https://jmespath.org/" target="_blank" rel="noopener">jmespath.org</a> for complete syntax reference.
				</p>
			</div>
			
			<div class="help-modal-footer">
				<button class="btn-primary" onclick={closeJMESPathHelp}>Got it!</button>
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
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}
	
	.help-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		background: #e0e7ff;
		color: #4f46e5;
		border: 1px solid #c7d2fe;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s;
		flex-shrink: 0;
	}
	
	.help-icon-btn:hover {
		background: #c7d2fe;
		color: #4338ca;
		transform: scale(1.1);
	}
	
	.required {
		color: #e53e3e;
		margin-left: 0.25rem;
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
	
	.help-text {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: #666;
	}
	
	.info-box {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 6px;
		margin-top: 1.5rem;
	}
	
	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}
	
	.info-content {
		flex: 1;
	}
	
	.info-content strong {
		color: #1e40af;
		display: block;
		margin-bottom: 0.5rem;
	}
	
	.info-content p {
		margin: 0;
		font-size: 0.875rem;
		color: #1e3a8a;
		line-height: 1.5;
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
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	/* Output Panel Styles */
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
	
	.loop-preview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #e0e0e0;
	}
	
	.preview-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.item-count {
		background: #10b981;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	
	.preview-items {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	
	.preview-note {
		margin: 0;
		font-size: 0.75rem;
		color: #666;
		font-style: italic;
	}
	
	.preview-item {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
	}
	
	.item-header {
		background: #e9ecef;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.item-number {
		font-size: 0.75rem;
		font-weight: 600;
		color: #495057;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.item-content {
		margin: 0;
		padding: 0.75rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #333;
		overflow-x: auto;
	}
	
	.more-items {
		text-align: center;
		padding: 0.75rem;
		background: #f8f9fa;
		border: 1px dashed #dee2e6;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #666;
		font-style: italic;
	}
	
	.empty-result {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
		color: #666;
	}
	
	.empty-result p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
	}
	
	.empty-result small {
		font-size: 0.75rem;
		color: #999;
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
		margin: 0 0 0.5rem 0;
		color: #666;
		font-size: 0.875rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}
	
	.error-hint {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: #999;
		font-style: italic;
	}
	
	/* JMESPath Help Modal Styles */
	.help-modal-overlay {
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
	
	.help-modal {
		background: white;
		border-radius: 8px;
		width: 100%;
		max-width: 700px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}
	
	.help-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		background: #f8f9fa;
	}
	
	.help-modal-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}
	
	.help-modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}
	
	.help-section {
		margin-bottom: 1.5rem;
	}
	
	.help-section:last-child {
		margin-bottom: 0;
	}
	
	.help-section h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #444;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	
	.help-section ul {
		margin: 0;
		padding-left: 1.5rem;
		list-style-type: disc;
	}
	
	.help-section li {
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
	}
	
	.help-section code {
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.8125rem;
		color: #1f2937;
		border: 1px solid #e5e7eb;
	}
	
	.help-example {
		margin: 0.75rem 0 0 0;
		padding: 0.75rem;
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
		overflow-x: auto;
		color: #333;
	}
	
	.help-note {
		margin: 1.5rem 0 0 0;
		padding: 1rem;
		background: #eff6ff;
		border-left: 3px solid #3b82f6;
		border-radius: 4px;
		font-size: 0.875rem;
		color: #1e40af;
		line-height: 1.5;
	}
	
	.help-note strong {
		font-weight: 600;
	}
	
	.help-note a {
		color: #2563eb;
		text-decoration: underline;
	}
	
	.help-note-small {
		margin: 0.5rem 0 0 0;
		padding: 0.5rem;
		background: #fef3c7;
		border-left: 2px solid #f59e0b;
		border-radius: 3px;
		font-size: 0.75rem;
		color: #92400e;
	}
	
	.help-modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
	}
	
	/* Scrollbar styling */
	.modal-body::-webkit-scrollbar,
	.help-modal-body::-webkit-scrollbar {
		width: 8px;
	}
	
	.modal-body::-webkit-scrollbar-track,
	.help-modal-body::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	
	.modal-body::-webkit-scrollbar-thumb,
	.help-modal-body::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 4px;
	}
	
	.modal-body::-webkit-scrollbar-thumb:hover,
	.help-modal-body::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>