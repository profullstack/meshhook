<script>
	/**
	 * Test run modal
	 * Test workflow execution without persisting the run
	 */

	let { workflow, isOpen = $bindable(false), onTest } = $props();

	let testInputs = $state('{}');
	let testing = $state(false);
	let testResult = $state(null);

	async function handleTest() {
		try {
			testing = true;
			testResult = null;

			// Validate JSON
			let inputs;
			try {
				inputs = JSON.parse(testInputs);
			} catch {
				alert('Invalid JSON in test inputs');
				return;
			}

			const result = await onTest?.({ inputs });
			testResult = result;
		} catch (error) {
			testResult = { error: error.message };
		} finally {
			testing = false;
		}
	}

	function close() {
		isOpen = false;
		testInputs = '{}';
		testResult = null;
	}

	function handleBackdropClick(event) {
		if (event.target === event.currentTarget) {
			close();
		}
	}
</script>

{#if isOpen && workflow}
	<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-header">
				<h2>Test Workflow: {workflow.name}</h2>
				<button class="close-button" onclick={close} aria-label="Close">×</button>
			</div>

			<div class="modal-body">
				<p class="help-text">
					Test your workflow with sample inputs. The run will not be persisted.
				</p>

				<div class="form-group">
					<label for="test-inputs">Test Inputs (JSON):</label>
					<textarea
						id="test-inputs"
						bind:value={testInputs}
						placeholder='{"key": "value"}'
						rows="8"
						class="inputs-textarea"
						disabled={testing}
					></textarea>
				</div>

				{#if testResult}
					<div class="test-result" class:error={testResult.error}>
						<h4>{testResult.error ? 'Test Failed' : 'Test Completed'}</h4>
						<pre>{JSON.stringify(testResult, null, 2)}</pre>
					</div>
				{/if}

				<div class="modal-actions">
					<button class="btn-secondary" onclick={close} disabled={testing}>Close</button>
					<button class="btn-primary" onclick={handleTest} disabled={testing}>
						{testing ? 'Testing...' : 'Run Test'}
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

	.help-text {
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
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

	.inputs-textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: monospace;
		resize: vertical;
	}

	.inputs-textarea:focus {
		outline: none;
		border-color: #4075a6;
	}

	.inputs-textarea:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	.test-result {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f0f7ff;
		border: 1px solid #3b82f6;
		border-radius: 6px;
	}

	.test-result.error {
		background: #fee;
		border-color: #ef4444;
	}

	.test-result h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.test-result pre {
		margin: 0;
		padding: 0.75rem;
		background: #1e1e1e;
		color: #d4d4d4;
		border-radius: 4px;
		font-size: 0.75rem;
		overflow-x: auto;
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