<script>
	/**
	 * LoadingSpinner component
	 * A reusable loading indicator that can be used across the application
	 * Supports multiple sizes and includes proper accessibility attributes
	 */

	let { size = 'medium', color = 'var(--color-theme-2)', label = 'Loading...' } = $props();

	const sizes = {
		small: '16px',
		medium: '32px',
		large: '48px'
	};

	const spinnerSize = sizes[size] || sizes.medium;
</script>

<div class="loading-spinner" role="status" aria-live="polite" aria-label={label}>
	<svg
		width={spinnerSize}
		height={spinnerSize}
		viewBox="0 0 50 50"
		class="spinner"
		aria-hidden="true"
	>
		<circle
			class="spinner-track"
			cx="25"
			cy="25"
			r="20"
			fill="none"
			stroke-width="4"
		></circle>
		<circle
			class="spinner-head"
			cx="25"
			cy="25"
			r="20"
			fill="none"
			stroke={color}
			stroke-width="4"
			stroke-linecap="round"
		></circle>
	</svg>
	<span class="visually-hidden">{label}</span>
</div>

<style>
	.loading-spinner {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.spinner {
		animation: rotate 1s linear infinite;
	}

	.spinner-track {
		stroke: rgba(0, 0, 0, 0.1);
	}

	.spinner-head {
		stroke-dasharray: 1, 200;
		stroke-dashoffset: 0;
		animation: dash 1.5s ease-in-out infinite;
	}

	@keyframes rotate {
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes dash {
		0% {
			stroke-dasharray: 1, 200;
			stroke-dashoffset: 0;
		}
		50% {
			stroke-dasharray: 90, 200;
			stroke-dashoffset: -35px;
		}
		100% {
			stroke-dasharray: 90, 200;
			stroke-dashoffset: -125px;
		}
	}

	.visually-hidden {
		border: 0;
		clip: rect(0 0 0 0);
		height: auto;
		margin: 0;
		overflow: hidden;
		padding: 0;
		position: absolute;
		width: 1px;
		white-space: nowrap;
	}
</style>
