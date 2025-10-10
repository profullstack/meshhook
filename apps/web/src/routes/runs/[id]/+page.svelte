<script>
	import WorkflowEditor from '$lib/components/WorkflowEditor.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const run = data.run;
	const nodes = $state(run?.workflow?.definition?.nodes || []);
	const edges = $state(run?.workflow?.definition?.edges || []);

	// Enhance nodes with run status
	const enhancedNodes = $derived(
		nodes.map((node) => {
			const nodeEvent = run?.events?.find((e) => e.node_id === node.id);
			return {
				...node,
				data: {
					...node.data,
					status: nodeEvent?.status || 'pending',
					executionTime: nodeEvent?.execution_time
				}
			};
		})
	);

	const statusColors = {
		pending: '#fbbf24',
		running: '#3b82f6',
		completed: '#10b981',
		failed: '#ef4444',
		cancelled: '#6b7280'
	};

	function formatDate(dateString) {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleString();
	}

	function formatDuration(ms) {
		if (!ms) return 'N/A';
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	}
</script>

<svelte:head>
	<title>Run {run?.id?.slice(0, 8)} - MeshHook</title>
</svelte:head>

<div class="run-detail-page">
	<header class="page-header">
		<div class="header-content">
			<button class="btn-back" onclick={() => goto('/runs')}>← Back to Runs</button>
			<div class="run-info">
				<h1>Run #{run?.id?.slice(0, 8)}</h1>
				<span
					class="status-badge"
					style="background-color: {statusColors[run?.status] || '#6b7280'}"
				>
					{run?.status}
				</span>
			</div>
		</div>
	</header>

	<div class="run-content">
		<div class="run-sidebar">
			<div class="info-panel">
				<h3>Run Information</h3>

				<div class="info-item">
					<span class="info-label">Workflow:</span>
					<span class="info-value">{run?.workflow?.name || 'Unknown'}</span>
				</div>

				<div class="info-item">
					<span class="info-label">Status:</span>
					<span class="info-value">{run?.status}</span>
				</div>

				<div class="info-item">
					<span class="info-label">Started:</span>
					<span class="info-value">{formatDate(run?.started_at)}</span>
				</div>

				{#if run?.completed_at}
					<div class="info-item">
						<span class="info-label">Completed:</span>
						<span class="info-value">{formatDate(run?.completed_at)}</span>
					</div>
				{/if}

				<div class="info-item">
					<span class="info-label">Duration:</span>
					<span class="info-value">
						{formatDuration(
							run?.completed_at
								? new Date(run.completed_at) - new Date(run.started_at)
								: Date.now() - new Date(run?.started_at || Date.now())
						)}
					</span>
				</div>

				{#if run?.error}
					<div class="info-item error">
						<span class="info-label">Error:</span>
						<span class="info-value">{run.error}</span>
					</div>
				{/if}
			</div>
		</div>

		<div class="run-main">
			<div class="dag-container">
				<h3>Execution Flow</h3>
				<div class="dag-viewer">
					<WorkflowEditor nodes={enhancedNodes} {edges} />
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.run-detail-page {
		min-height: 100vh;
		background: #f8f9fa;
	}

	.page-header {
		background: white;
		border-bottom: 1px solid #e0e0e0;
		padding: 1.5rem 2rem;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.btn-back {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-back:hover {
		background: #f5f5f5;
	}

	.run-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
		font-family: monospace;
	}

	.status-badge {
		padding: 0.375rem 0.875rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 600;
		color: white;
		text-transform: uppercase;
	}

	.run-content {
		display: flex;
		gap: 2rem;
		padding: 2rem;
	}

	.run-sidebar {
		width: 300px;
		flex-shrink: 0;
	}

	.info-panel {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e0e0e0;
	}

	.info-panel h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;
	}

	.info-item.error {
		color: #ef4444;
	}

	.info-label {
		font-size: 0.75rem;
		color: #999;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.info-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
	}

	.run-main {
		flex: 1;
		min-width: 0;
	}

	.dag-container {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e0e0e0;
		height: calc(100vh - 200px);
		display: flex;
		flex-direction: column;
	}

	.dag-container h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.dag-viewer {
		flex: 1;
		position: relative;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
	}
</style>