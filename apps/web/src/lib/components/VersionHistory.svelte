<script>
	/**
	 * Version history component
	 * Shows workflow version history with rollback capability
	 */

	import LoadingButton from './LoadingButton.svelte';

	let { workflowId, versions = [], onRollback } = $props();

	let rollingBack = $state(false);
	let rollbackVersion = $state(null);

	function formatDate(dateString) {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleRollback(version) {
		if (confirm(`Rollback to version ${version.version}? This will create a new version.`)) {
			try {
				rollingBack = true;
				rollbackVersion = version.id;
				await onRollback?.(version);
			} finally {
				rollingBack = false;
				rollbackVersion = null;
			}
		}
	}
</script>

<div class="version-history">
	<h3>Version History</h3>

	{#if versions.length === 0}
		<p class="empty-message">No version history available</p>
	{:else}
		<div class="versions-list">
			{#each versions as version}
				<div class="version-item" class:current={version.is_current}>
					<div class="version-header">
						<div class="version-info">
							<span class="version-number">v{version.version}</span>
							{#if version.is_current}
								<span class="current-badge">Current</span>
							{/if}
							{#if version.status === 'published'}
								<span class="published-badge">Published</span>
							{/if}
						</div>
						<span class="version-date">{formatDate(version.created_at)}</span>
					</div>

					{#if version.description}
						<p class="version-description">{version.description}</p>
					{/if}

					<div class="version-stats">
						<span>Nodes: {version.definition?.nodes?.length || 0}</span>
						<span>Edges: {version.definition?.edges?.length || 0}</span>
					</div>

					{#if !version.is_current}
						<div class="version-actions">
							<LoadingButton
								variant="secondary"
								class="btn-rollback"
								loading={rollingBack && rollbackVersion === version.id}
								loadingText="Rolling back..."
								onclick={() => handleRollback(version)}
							>
								Rollback to this version
							</LoadingButton>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.version-history {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #333;
	}

	.empty-message {
		text-align: center;
		color: #999;
		padding: 2rem;
	}

	.versions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.version-item {
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		padding: 1rem;
		transition: all 0.2s;
	}

	.version-item.current {
		border-color: #4075a6;
		background: #f0f7ff;
	}

	.version-item:hover {
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.version-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.version-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version-number {
		font-weight: 600;
		color: #333;
	}

	.current-badge,
	.published-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.current-badge {
		background: #4075a6;
		color: white;
	}

	.published-badge {
		background: #10b981;
		color: white;
	}

	.version-date {
		font-size: 0.875rem;
		color: #666;
	}

	.version-description {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		color: #666;
	}

	.version-stats {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #666;
		margin-bottom: 0.75rem;
	}

	.version-actions {
		padding-top: 0.75rem;
		border-top: 1px solid #e0e0e0;
	}

	.version-actions :global(.btn-rollback) {
		width: 100%;
	}
</style>