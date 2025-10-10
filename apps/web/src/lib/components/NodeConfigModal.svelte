<script>
	let { node, onSave, onCancel } = $props();
	
	// Local state for editing
	let editedNode = $state({ ...node });
	let config = $state(node.data?.config || {});
	
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
				{ name: 'expression', label: 'JMESPath Expression', type: 'textarea', required: true, placeholder: 'data.items[*].{id: id, name: name}' },
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
				{ name: 'path', label: 'Webhook Path', type: 'text', required: true, placeholder: '/hooks/my-workflow' },
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
	
	const currentConfig = nodeConfigs[node.data?.type] || { fields: [] };
	
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
</script>

<div class="modal-overlay" onclick={handleOverlayClick} role="dialog" aria-modal="true">
	<div class="modal-content">
		<div class="modal-header">
			<h2>Configure {node.data?.label || 'Node'}</h2>
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
			
			{#each currentConfig.fields as field}
				<div class="form-group">
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
							rows="4"
						></textarea>
					{:else if field.type === 'select'}
						<select id={field.name} bind:value={config[field.name]} required={field.required}>
							<option value="">Select {field.label}</option>
							{#each field.options as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{/if}
				</div>
			{/each}
		</div>
		
		<div class="modal-footer">
			<button class="btn-secondary" onclick={handleCancel}>Cancel</button>
			<button class="btn-primary" onclick={handleSave}>Save Configuration</button>
		</div>
	</div>
</div>

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
</style>