<script>
	import HttpResponseViewer from './HttpResponseViewer.svelte';
	import VariablePickerTemplate from './VariablePickerTemplate.svelte';
	import TransformNodeModal from './TransformNodeModal.svelte';
	
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
	
	// Node type configurations
	const nodeConfigs = {
		httpCall: {
			fields: [
				{ name: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://api.example.com/users/{{userId}}', helpText: 'Use {{variable}} syntax to reference input data' },
				{ name: 'method', label: 'Method', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
				{ name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer {{token}}"}', helpText: 'Use {{variable}} for dynamic values' },
				{ name: 'body', label: 'Body (JSON)', type: 'textarea', placeholder: '{"name": "{{user.name}}", "email": "{{user.email}}"}', helpText: 'Use {{variable}} syntax. Leave empty to use input directly as body.' },
				{ name: 'timeout', label: 'Timeout (ms)', type: 'number', placeholder: '30000' }
			],
			supportsInput: true,
			supportsTemplates: true,
			inputDescription: 'This node supports template variables using {{variable}} syntax in URL, headers, and body. You can reference nested data like {{user.profile.name}} or array items like {{items[0]}}.'
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
				{ name: 'url', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://api.example.com/webhook/{{webhookId}}', helpText: 'Use {{variable}} syntax to reference input data' },
				{ name: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['POST', 'PUT', 'PATCH'] },
				{ name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer {{token}}"}', helpText: 'Use {{variable}} for dynamic values' },
				{ name: 'bodyTemplate', label: 'Body Template', type: 'textarea', required: true, placeholder: '{\n  "title": "{{title}}",\n  "content": "{{content}}",\n  "user": "{{user.name}}"\n}', rows: 8, helpText: 'Use {{variable}} syntax. Supports nested paths like {{user.profile.name}}' },
				{ name: 'description', label: 'Description', type: 'text', placeholder: 'Webhook description' }
			],
			supportsInput: true,
			supportsTemplates: true,
			inputDescription: 'This node supports template variables using {{variable}} syntax in URL, headers, and body. You can reference nested data like {{user.profile.name}} or array items like {{items[0]}}.'
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
</script>

{#if editedNode.data?.type === 'transform'}
	<!-- Use specialized Transform Node Modal -->
	<TransformNodeModal
		{node}
		{onSave}
		{onCancel}
		{previousNodeOutput}
		{previousNode}
		{onRefreshPreviousNode}
	/>
{:else}
	<!-- Standard Node Configuration Modal -->
	<div class="modal-overlay" onclick={handleOverlayClick} onkeydown={(e) => e.key === 'Escape' && handleCancel()} role="dialog" aria-modal="true" tabindex="-1">
		<div class="modal-content">
			<div class="modal-header">
				<h2>Configure {editedNode.data?.label || 'Node'}</h2>
				<button class="close-btn" onclick={handleCancel} aria-label="Close">&times;</button>
			</div>
			
			<div class="modal-body">
				{#if currentConfig.supportsTemplates}
					<div class="info-banner template-info">
						<div class="info-icon">✨</div>
						<div class="info-content">
							<strong>Template Variables:</strong>
							<p>{currentConfig.inputDescription}</p>
							{#if previousNode?.data?.label}
								<p class="previous-node-info">
									📥 Receiving data from: <strong>{previousNode.data.label}</strong>
								</p>
							{/if}
							<div class="template-examples">
								<strong>Examples:</strong>
								<code>{'{{userId}}'}</code>
								<code>{'{{user.name}}'}</code>
								<code>{'{{items[0]}}'}</code>
							</div>
						</div>
					</div>
				{:else if currentConfig.supportsInput && previousNode}
					<div class="info-banner">
						<div class="info-icon">ℹ️</div>
						<div class="info-content">
							<strong>Input from Previous Node:</strong>
							<p>{currentConfig.inputDescription}</p>
							{#if previousNode.data?.label}
								<p class="previous-node-info">
									Connected to: <strong>{previousNode.data.label}</strong>
								</p>
							{/if}
						</div>
					</div>
				{/if}
				
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
							{#if field.helpText}
								<div class="help-text">{field.helpText}</div>
							{/if}
							
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
{/if}

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
	
	.info-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 6px;
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
	
	.info-content p + p {
		margin-top: 0.5rem;
	}
	
	.previous-node-info {
		font-style: italic;
	}
	
	.help-text {
		font-size: 0.75rem;
		color: #666;
		margin-top: -0.25rem;
		margin-bottom: 0.5rem;
		font-style: italic;
	}
	
	.template-info {
		background: #f0fdf4;
		border-color: #86efac;
	}
	
	.template-info .info-content strong {
		color: #15803d;
	}
	
	.template-info .info-content p {
		color: #166534;
	}
	
	.template-examples {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #86efac;
	}
	
	.template-examples strong {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
	}
	
	.template-examples code {
		display: inline-block;
		background: #dcfce7;
		color: #15803d;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		margin-right: 0.5rem;
		margin-bottom: 0.25rem;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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