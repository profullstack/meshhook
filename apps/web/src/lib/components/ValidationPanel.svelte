<script>
	/**
	 * Validation panel component
	 * Displays workflow validation errors and warnings
	 */

	let { errors = [], isOpen = $bindable(true) } = $props();

	const hasErrors = $derived(errors.length > 0);

	function toggle() {
		isOpen = !isOpen;
	}
</script>

{#if hasErrors}
	<div class="validation-panel" class:collapsed={!isOpen}>
		<button class="panel-header" onclick={toggle}>
			<div class="header-content">
				<span class="icon">⚠️</span>
				<span class="title">Validation Issues ({errors.length})</span>
			</div>
			<span class="toggle-icon">{isOpen ? '▼' : '▶'}</span>
		</button>

		{#if isOpen}
			<div class="panel-body">
				<ul class="error-list">
					{#each errors as error}
						<li class="error-item">
							<span class="error-icon">•</span>
							<span class="error-text">{error}</span>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
{/if}

<style>
	.validation-panel {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		background: white;
		border: 2px solid #e53e3e;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		max-width: 400px;
		z-index: 100;
		transition: all 0.2s;
	}

	.validation-panel.collapsed {
		max-width: 300px;
	}

	.panel-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #fee;
		border: none;
		border-radius: 6px 6px 0 0;
		cursor: pointer;
		transition: background 0.2s;
	}

	.panel-header:hover {
		background: #fdd;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.icon {
		font-size: 1.25rem;
	}

	.title {
		font-weight: 600;
		color: #c53030;
		font-size: 0.875rem;
	}

	.toggle-icon {
		color: #c53030;
		font-size: 0.75rem;
	}

	.panel-body {
		padding: 1rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.error-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.error-item {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid #fee;
	}

	.error-item:last-child {
		border-bottom: none;
	}

	.error-icon {
		color: #e53e3e;
		font-weight: bold;
	}

	.error-text {
		flex: 1;
		font-size: 0.875rem;
		color: #333;
		line-height: 1.4;
	}

	/* Scrollbar styling */
	.panel-body::-webkit-scrollbar {
		width: 6px;
	}

	.panel-body::-webkit-scrollbar-track {
		background: #f1f1f1;
	}

	.panel-body::-webkit-scrollbar-thumb {
		background: #ccc;
		border-radius: 3px;
	}

	.panel-body::-webkit-scrollbar-thumb:hover {
		background: #999;
	}
</style>