<script>
	/**
	 * Masked input component for displaying/editing secrets
	 * Shows masked value by default with show/hide toggle
	 */

	let {
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		readonly = false
	} = $props();

	let showValue = $state(false);
	let copied = $state(false);

	const maskedValue = $derived('•'.repeat(Math.min(value.length, 20)));

	function toggleShow() {
		showValue = !showValue;
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (error) {
			alert('Failed to copy to clipboard');
		}
	}
</script>

<div class="masked-input">
	<div class="input-container">
		{#if showValue}
			<input
				type="text"
				bind:value
				{placeholder}
				{disabled}
				{readonly}
				class="secret-input"
			/>
		{:else}
			<input
				type="text"
				value={maskedValue}
				{placeholder}
				disabled
				readonly
				class="secret-input masked"
			/>
		{/if}
	</div>

	<div class="input-actions">
		<button
			type="button"
			class="btn-icon"
			onclick={toggleShow}
			title={showValue ? 'Hide' : 'Show'}
			disabled={disabled}
		>
			{showValue ? '🙈' : '👁️'}
		</button>

		{#if value}
			<button
				type="button"
				class="btn-icon"
				onclick={copyToClipboard}
				title="Copy to clipboard"
				disabled={disabled}
			>
				{copied ? '✅' : '📋'}
			</button>
		{/if}
	</div>
</div>

<style>
	.masked-input {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.input-container {
		flex: 1;
	}

	.secret-input {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.secret-input.masked {
		font-family: monospace;
		letter-spacing: 2px;
		background: #f5f5f5;
	}

	.secret-input:focus {
		outline: none;
		border-color: #4075a6;
	}

	.secret-input:disabled {
		background: #f5f5f5;
		cursor: not-allowed;
	}

	.input-actions {
		display: flex;
		gap: 0.25rem;
	}

	.btn-icon {
		padding: 0.5rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-icon:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #4075a6;
	}

	.btn-icon:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>