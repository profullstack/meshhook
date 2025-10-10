<script>
	/**
	 * LoadingButton component
	 * A button that shows a loading spinner when an async operation is in progress
	 * Automatically disables the button during loading state
	 */

	import LoadingSpinner from './LoadingSpinner.svelte';

	let {
		loading = false,
		disabled = false,
		variant = 'primary',
		type = 'button',
		onclick = undefined,
		children,
		loadingText = null,
		class: className = '',
		...rest
	} = $props();

	const isDisabled = $derived(loading || disabled);
</script>

<button
	type={type}
	class="loading-button btn-{variant} {className}"
	disabled={isDisabled}
	onclick={onclick}
	{...rest}
>
	{#if loading}
		<span class="button-content loading">
			<LoadingSpinner size="small" color={variant === 'primary' ? 'white' : 'currentColor'} />
			<span class="button-text">{loadingText || 'Loading...'}</span>
		</span>
	{:else}
		<span class="button-content">
			{@render children?.()}
		</span>
	{/if}
</button>

<style>
	.loading-button {
		position: relative;
		padding: 0.625rem 1.25rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		font-family: inherit;
	}

	.loading-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.button-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.button-content.loading {
		gap: 0.5rem;
	}

	.button-text {
		white-space: nowrap;
	}
</style>
