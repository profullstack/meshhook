<script>
	/**
	 * Run card component for displaying workflow run information
	 */

	let { run, onView, onRetry, onCancel } = $props();

	const statusColors = {
		pending: '#fbbf24',
		running: '#3b82f6',
		completed: '#10b981',
		failed: '#ef4444',
		cancelled: '#6b7280'
	};

	const statusColor = $derived(statusColors[run.status] || '#6b7280');

	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatDuration(startedAt, completedAt) {
		if (!startedAt) return 'N/A';
		const start = new Date(startedAt);
		const end = completedAt ? new Date(completedAt) : new Date();
		const duration = Math.floor((end - start) / 1000);

		if (duration < 60) return `${duration}s`;
		if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
		return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
	}

	const duration = $derived(formatDuration(run.started_at, run.completed_at));
</script>

<div class="run-card">
	<div class="card-header">
		<div class="run-info">
			<h4 class="run-id">Run #{run.id.slice(0, 8)}</h4>
			<span class="status-badge" style="background-color: {statusColor}">
				{run.status}
			</span>
		</div>
		<span class="run-date">{formatDate(run.created_at)}</span>
	</div>

	<div class="card-body">
		<div class="run-meta">
			<div class="meta-item">
				<span class="meta-label">Workflow:</span>
				<span class="meta-value">{run.workflow?.name || 'Unknown'}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">Duration:</span>
				<span class="meta-value">{duration}</span>
			</div>
			{#if run.error}
				<div class="meta-item error">
					<span class="meta-label">Error:</span>
					<span class="meta-value">{run.error}</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="card-actions">
		<button class="btn-action" onclick={() => onView?.(run)}>View Details</button>
		{#if run.status === 'failed'}
			<button class="btn-action" onclick={() => onRetry?.(run)}>Retry</button>
		{/if}
		{#if run.status === 'running' || run.status === 'pending'}
			<button class="btn-action btn-danger" onclick={() => onCancel?.(run)}>Cancel</button>
		{/if}
	</div>
</div>

<style>
	.run-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.2s;
	}

	.run-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #4075a6;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.run-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.run-id {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
		font-family: monospace;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	.run-date {
		font-size: 0.875rem;
		color: #666;
	}

	.card-body {
		margin-bottom: 1rem;
	}

	.run-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.meta-item {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.meta-item.error {
		color: #ef4444;
	}

	.meta-label {
		font-weight: 600;
		color: #666;
	}

	.meta-value {
		color: #333;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #f0f0f0;
	}

	.btn-action {
		flex: 1;
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-action:hover {
		background: #f5f5f5;
		border-color: #4075a6;
	}

	.btn-danger:hover {
		background: #fee;
		border-color: #ef4444;
		color: #ef4444;
	}
</style>