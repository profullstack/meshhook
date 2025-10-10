<script>
	/**
	 * Workflow card component for list/grid view
	 */

	let { workflow, onEdit, onDelete, onDuplicate } = $props();

	const statusColors = {
		draft: '#fbbf24',
		published: '#10b981'
	};

	const statusColor = $derived(statusColors[workflow.status] || '#6b7280');

	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function handleEdit() {
		onEdit?.(workflow);
	}

	function handleDelete() {
		if (confirm(`Delete workflow "${workflow.name}"?`)) {
			onDelete?.(workflow);
		}
	}

	function handleDuplicate() {
		onDuplicate?.(workflow);
	}
</script>

<div class="workflow-card">
	<div class="card-header">
		<h3 class="workflow-name">{workflow.name}</h3>
		<span class="status-badge" style="background-color: {statusColor}">
			{workflow.status}
		</span>
	</div>

	{#if workflow.description}
		<p class="workflow-description">{workflow.description}</p>
	{/if}

	<div class="card-meta">
		<div class="meta-item">
			<span class="meta-label">Nodes:</span>
			<span class="meta-value">{workflow.definition?.nodes?.length || 0}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Version:</span>
			<span class="meta-value">{workflow.version}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">Updated:</span>
			<span class="meta-value">{formatDate(workflow.updated_at)}</span>
		</div>
	</div>

	<div class="card-actions">
		<button class="btn-action" onclick={handleEdit}>Edit</button>
		<button class="btn-action" onclick={handleDuplicate}>Duplicate</button>
		<button class="btn-action btn-danger" onclick={handleDelete}>Delete</button>
	</div>
</div>

<style>
	.workflow-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		transition: all 0.2s;
	}

	.workflow-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: #4075a6;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	.workflow-name {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
		flex: 1;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	.workflow-description {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		color: #666;
		line-height: 1.5;
	}

	.card-meta {
		display: flex;
		gap: 1.5rem;
		margin-bottom: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #f0f0f0;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.meta-label {
		font-size: 0.75rem;
		color: #999;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.meta-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #333;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
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
		border-color: #e53e3e;
		color: #e53e3e;
	}
</style>