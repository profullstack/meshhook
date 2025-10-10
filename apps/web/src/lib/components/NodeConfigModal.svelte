<script>
	import SchemaForm from './forms/SchemaForm.svelte';

	/**
	 * Modal for configuring workflow nodes
	 * Uses JSON schema to generate dynamic forms
	 */

	let { node, isOpen = $bindable(false), onSave, secrets = [] } = $props();

	let formValues = $state({});
	let formErrors = $state({});

	// Node type schemas
	const nodeSchemas = {
		httpCall: {
			type: 'object',
			required: ['url', 'method'],
			properties: {
				url: {
					type: 'string',
					title: 'URL',
					description: 'The HTTP endpoint to call',
					placeholder: 'https://api.example.com/endpoint',
					format: 'uri'
				},
				method: {
					type: 'string',
					title: 'Method',
					enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
					default: 'GET'
				},
				headers: {
					type: 'string',
					title: 'Headers',
					description: 'JSON object of HTTP headers',
					format: 'textarea',
					placeholder: '{"Content-Type": "application/json"}'
				},
				body: {
					type: 'string',
					title: 'Request Body',
					description: 'Request body (for POST/PUT/PATCH)',
					format: 'textarea',
					placeholder: '{"key": "value"}'
				},
				timeout: {
					type: 'integer',
					title: 'Timeout (ms)',
					description: 'Request timeout in milliseconds',
					default: 30000,
					minimum: 1000,
					maximum: 300000
				}
			}
		},
		transform: {
			type: 'object',
			required: ['expression'],
			properties: {
				expression: {
					type: 'string',
					title: 'JMESPath Expression',
					description: 'Transform data using JMESPath syntax',
					format: 'textarea',
					placeholder: 'data.items[*].{id: id, name: name}'
				}
			}
		},
		delay: {
			type: 'object',
			required: ['duration'],
			properties: {
				duration: {
					type: 'integer',
					title: 'Duration (ms)',
					description: 'Delay duration in milliseconds',
					minimum: 100,
					maximum: 3600000,
					default: 1000
				}
			}
		},
		conditional: {
			type: 'object',
			required: ['condition'],
			properties: {
				condition: {
					type: 'string',
					title: 'Condition',
					description: 'JavaScript expression that evaluates to true/false',
					format: 'textarea',
					placeholder: 'data.status === "success"'
				}
			}
		}
	};

	// Get schema for current node type
	const schema = $derived(node ? nodeSchemas[node.type] || {} : {});

	// Initialize form values from node data
	$effect(() => {
		if (node?.data?.config) {
			formValues = { ...node.data.config };
		} else {
			formValues = {};
		}
	});

	function handleSave(values) {
		onSave?.({ ...node, data: { ...node.data, config: values } });
		close();
	}

	function close() {
		isOpen = false;
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
</script>

{#if isOpen && node}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>Configure {node.data?.label || node.type}</h2>
				<button class="close-button" onclick={close} aria-label="Close">×</button>
			</div>

			<div class="modal-body">
				<SchemaForm
					{schema}
					bind:values={formValues}
					bind:errors={formErrors}
					{secrets}
					onSubmit={handleSave}
					submitLabel="Save Configuration"
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
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
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 8px;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
		max-width: 600px;
		width: 100%;
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

	.close-button {
		background: none;
		border: none;
		font-size: 2rem;
		line-height: 1;
		color: #666;
		cursor: pointer;
		padding: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: #f5f5f5;
		color: #333;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}
</style>