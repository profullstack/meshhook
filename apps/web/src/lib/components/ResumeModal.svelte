<script>
	/**
	 * Resume from step modal
	 * Allows resuming failed runs from a specific checkpoint
	 */

	let { run, isOpen = $bindable(false), onResume } = $props();

	let selectedNodeId = $state('');
	let modifiedInputs = $state({});
	let resuming = $state(false);

	const resumableNodes = $derived(() => {
		if (!run?.workflow?.definition?.nodes) return [];
		return run.workflow.definition.nodes.filter((node) => {
			const event = run.events?.find((e) => e.node_id === node.id);
			return event?.status === 'completed' || event?.status === 'failed';
		});
	});

	async function handleResume() {
		if (!selectedNodeId) {
			alert('Please select a node to resume from');
			return;
		}

		try {
			resuming = true;
			await onResume?.({ nodeId: selectedNodeId, inputs: modifiedInputs });
			close();
		} catch (error) {
			alert(`Error resuming run: ${error.message}`);
		} finally {
			resuming = false;
		}
	}

	function close() {
		isOpen = false;
		selectedNodeId = '';
		modifiedInputs = {};
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
</script>

{#if isOpen && run}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>Resume Run from Step</h2>
				<button class="close-button" onclick={close} aria-label="Close">×</button>
			</div>

			<div class="modal-body">
				<p class="help-text">
					Select a node to resume execution from. The workflow will continue from this point.
				</p>

				<div class="form-group">
					<label for="node-select">Resume from Node:</label>
					<select id="node-select" bind:value={selectedNodeId} class="node-select">
						<option value="">Select a node...</option>
						{#each resumableNodes as node}
							<option value={node.id}>
								{node.data?.label || node.type} ({node.id})
							</option>
						{/each}
					</select>
				</div>

				{#if selectedNodeId}
					<div class="form-group">
						<label for="inputs">Modified Inputs (JSON):</label>
						<textarea
							id="inputs"
							bind:value={modifiedInputs}
							placeholder="{}"
							rows="6"
							class="inputs-textarea"
						></textarea>
						<p class="help-text-small">Optional: Provide modified inputs as JSON</p>
					</div>
				{/if}

				<div class="modal-actions">
					<button class="btn-secondary" onclick={close} disabled={resuming}>Cancel</button>
					<button class="btn-primary" onclick={handleResume} disabled={resuming || !selectedNodeId}>
						{resuming ? 'Resuming...' : 'Resume Run'}
					</button>
				</div>
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
		max-width: 500px;
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

	.help-text {
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
	}

	.help-text-small {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #999;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
		font-size: 0.875rem;
	}

	.node-select,
	.inputs-textarea {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.inputs-textarea {
		font-family: monospace;
		resize: vertical;
	}

	.node-select:focus,
	.inputs-textarea:focus {
		outline: none;
		border-color: #4075a6;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid #e0e0e0;
	}

	button {
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--color-theme-1);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-theme-2);
	}

	.btn-secondary {
		background: white;
		border: 1px solid #ddd;
		color: #333;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f5f5f5;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>