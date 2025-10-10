<script>
	import { createClient } from '$lib/supabase.js';
	import { onMount } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';

	/**
	 * Live logs component with Supabase Realtime
	 * Streams logs in real-time for a specific run
	 */

	let { runId } = $props();

	let logs = $state([]);
	let filterLevel = $state('all');
	let searchQuery = $state('');
	let autoScroll = $state(true);
	let logsContainer;
	let loading = $state(true);
	let error = $state(null);

	const supabase = createClient();

	const filteredLogs = $derived(() => {
		let result = logs;

		if (filterLevel !== 'all') {
			result = result.filter((log) => log.level === filterLevel);
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter((log) => log.message.toLowerCase().includes(query));
		}

		return result;
	});

	const filtered = filteredLogs();

	onMount(() => {
		// Subscribe to real-time log updates
		const channel = supabase
			.channel(`run-logs-${runId}`)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'logs',
					filter: `run_id=eq.${runId}`
				},
				(payload) => {
					logs = [...logs, payload.new];
					if (autoScroll && logsContainer) {
						setTimeout(() => {
							logsContainer.scrollTop = logsContainer.scrollHeight;
						}, 100);
					}
				}
			)
			.subscribe();

		// Load existing logs
		loadLogs();

		return () => {
			supabase.removeChannel(channel);
		};
	});

	async function loadLogs() {
		try {
			loading = true;
			error = null;
			const { data, error: fetchError } = await supabase
				.from('logs')
				.select('*')
				.eq('run_id', runId)
				.order('created_at', { ascending: true });

			if (fetchError) {
				console.error('Error loading logs:', fetchError);
				error = fetchError.message;
			} else {
				logs = data || [];
				if (autoScroll && logsContainer) {
					setTimeout(() => {
						logsContainer.scrollTop = logsContainer.scrollHeight;
					}, 100);
				}
			}
		} finally {
			loading = false;
		}
	}

	function formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function getLevelColor(level) {
		const colors = {
			info: '#3b82f6',
			warn: '#fbbf24',
			error: '#ef4444',
			debug: '#6b7280'
		};
		return colors[level] || '#6b7280';
	}
</script>

<div class="live-logs">
	<div class="logs-header">
		<h3>Live Logs</h3>
		<div class="logs-controls">
			<input
				type="search"
				bind:value={searchQuery}
				placeholder="Search logs..."
				class="search-input"
			/>
			<select bind:value={filterLevel} class="filter-select">
				<option value="all">All Levels</option>
				<option value="info">Info</option>
				<option value="warn">Warn</option>
				<option value="error">Error</option>
				<option value="debug">Debug</option>
			</select>
			<label class="auto-scroll-label">
				<input type="checkbox" bind:checked={autoScroll} />
				Auto-scroll
			</label>
		</div>
	</div>

	<div class="logs-container" bind:this={logsContainer}>
		{#if loading}
			<div class="loading-state">
				<LoadingSpinner size="medium" label="Loading logs..." />
				<p class="loading-text">Loading logs...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<p class="error-message">Failed to load logs: {error}</p>
			</div>
		{:else if filtered.length === 0}
			<p class="empty-message">No logs yet...</p>
		{:else}
			{#each filtered as log (log.id)}
				<div class="log-entry" data-level={log.level}>
					<span class="log-time">{formatTime(log.created_at)}</span>
					<span class="log-level" style="color: {getLevelColor(log.level)}">
						[{log.level.toUpperCase()}]
					</span>
					<span class="log-message">{log.message}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.live-logs {
		background: white;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.logs-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e0e0e0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.logs-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.search-input,
	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.search-input {
		width: 200px;
	}

	.search-input:focus,
	.filter-select:focus {
		outline: none;
		border-color: #4075a6;
	}

	.auto-scroll-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.logs-container {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		background: #1e1e1e;
		font-family: 'Courier New', monospace;
		font-size: 0.8125rem;
		line-height: 1.6;
	}

	.loading-state,
	.error-state,
	.empty-message {
		color: #999;
		text-align: center;
		padding: 2rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loading-text {
		margin: 0;
		font-size: 0.875rem;
	}

	.error-state {
		color: #ef4444;
	}

	.error-message {
		margin: 0;
		font-size: 0.875rem;
	}

	.log-entry {
		display: flex;
		gap: 0.75rem;
		padding: 0.25rem 0;
		color: #d4d4d4;
	}

	.log-entry[data-level='error'] {
		background: rgba(239, 68, 68, 0.1);
	}

	.log-entry[data-level='warn'] {
		background: rgba(251, 191, 36, 0.1);
	}

	.log-time {
		color: #6b7280;
		flex-shrink: 0;
	}

	.log-level {
		font-weight: 600;
		flex-shrink: 0;
		min-width: 60px;
	}

	.log-message {
		flex: 1;
		word-break: break-word;
	}

	/* Scrollbar styling */
	.logs-container::-webkit-scrollbar {
		width: 8px;
	}

	.logs-container::-webkit-scrollbar-track {
		background: #2d2d2d;
	}

	.logs-container::-webkit-scrollbar-thumb {
		background: #555;
		border-radius: 4px;
	}

	.logs-container::-webkit-scrollbar-thumb:hover {
		background: #777;
	}
</style>