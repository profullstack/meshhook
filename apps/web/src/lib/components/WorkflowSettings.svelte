<script>
	/**
	 * Workflow settings component
	 * Configure workflow metadata, triggers, timeouts, and retry policies
	 */

	import LoadingButton from './LoadingButton.svelte';

	let {
		workflow,
		onSave,
		disabled = false
	} = $props();

	let settings = $state({
		name: workflow?.name || '',
		description: workflow?.description || '',
		timeout: workflow?.settings?.timeout || 300000,
		retryAttempts: workflow?.settings?.retryAttempts || 3,
		retryDelay: workflow?.settings?.retryDelay || 1000,
		webhookUrl: workflow?.webhook_url || ''
	});

	let saving = $state(false);

	async function handleSave() {
		try {
			saving = true;
			await onSave?.(settings);
		} finally {
			saving = false;
		}
	}

	function copyWebhookUrl() {
		navigator.clipboard.writeText(settings.webhookUrl);
		alert('Webhook URL copied to clipboard!');
	}
</script>

<div class="workflow-settings">
	<h3>Workflow Settings</h3>

	<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
		<div class="settings-section">
			<h4>General</h4>

			<div class="form-group">
				<label for="name">Workflow Name</label>
				<input
					id="name"
					type="text"
					bind:value={settings.name}
					placeholder="My Workflow"
					required
					{disabled}
				/>
			</div>

			<div class="form-group">
				<label for="description">Description</label>
				<textarea
					id="description"
					bind:value={settings.description}
					placeholder="Describe what this workflow does..."
					rows="3"
					{disabled}
				></textarea>
			</div>
		</div>

		<div class="settings-section">
			<h4>Execution Settings</h4>

			<div class="form-group">
				<label for="timeout">Timeout (ms)</label>
				<input
					id="timeout"
					type="number"
					bind:value={settings.timeout}
					min="1000"
					max="3600000"
					step="1000"
					{disabled}
				/>
				<p class="help-text">Maximum execution time in milliseconds</p>
			</div>

			<div class="form-group">
				<label for="retryAttempts">Retry Attempts</label>
				<input
					id="retryAttempts"
					type="number"
					bind:value={settings.retryAttempts}
					min="0"
					max="10"
					{disabled}
				/>
				<p class="help-text">Number of retry attempts on failure</p>
			</div>

			<div class="form-group">
				<label for="retryDelay">Retry Delay (ms)</label>
				<input
					id="retryDelay"
					type="number"
					bind:value={settings.retryDelay}
					min="100"
					max="60000"
					step="100"
					{disabled}
				/>
				<p class="help-text">Initial delay between retries (exponential backoff)</p>
			</div>
		</div>

		{#if settings.webhookUrl}
			<div class="settings-section">
				<h4>Webhook Trigger</h4>

				<div class="form-group">
					<label>Webhook URL</label>
					<div class="webhook-url-container">
						<input
							type="text"
							value={settings.webhookUrl}
							readonly
							class="webhook-url"
						/>
						<button type="button" class="btn-copy" onclick={copyWebhookUrl}>
							Copy
						</button>
					</div>
					<p class="help-text">POST to this URL to trigger the workflow</p>
				</div>
			</div>
		{/if}

		<div class="form-actions">
			<LoadingButton
				type="submit"
				variant="primary"
				loading={saving}
				disabled={disabled}
				loadingText="Saving..."
			>
				Save Settings
			</LoadingButton>
		</div>
	</form>
</div>

<style>
	.workflow-settings {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		max-width: 600px;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #333;
	}

	h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.settings-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.settings-section:last-of-type {
		border-bottom: none;
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

	input[type='text'],
	input[type='number'],
	textarea {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #4075a6;
	}

	input:disabled,
	textarea:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
	}

	.help-text {
		margin: 0.5rem 0 0 0;
		font-size: 0.75rem;
		color: #666;
	}

	.webhook-url-container {
		display: flex;
		gap: 0.5rem;
	}

	.webhook-url {
		flex: 1;
		font-family: monospace;
		font-size: 0.8125rem;
		background: #f5f5f5;
	}

	.btn-copy {
		padding: 0.625rem 1rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-copy:hover {
		background: #f5f5f5;
		border-color: #4075a6;
	}

	.form-actions {
		margin-top: 2rem;
		display: flex;
		justify-content: flex-end;
	}
</style>