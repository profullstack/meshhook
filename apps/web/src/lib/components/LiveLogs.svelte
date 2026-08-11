<script>
	import { onMount } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';

	/**
	 * Live logs for a run.
	 *
	 * Supabase Realtime is gone, so this consumes the SSE stream at
	 * /api/runs/[id]/events instead of a websocket channel. EventSource handles
	 * reconnection itself and replays from Last-Event-ID, so no backfill request
	 * is needed — the stream opens by sending the whole history.
	 *
	 * It also read a `logs` table that no schema ever defined. The real records
	 * are workflow_events, which have a `type` and a JSON `payload` rather than
	 * a level and a message, so they are mapped to the shape this view renders.
	 */

	let { runId } = $props();

	let logs = $state([]);
	let filterLevel = $state('all');
	let searchQuery = $state('');
	let autoScroll = $state(true);
	let logsContainer;
	let loading = $state(true);
	let error = $state(null);

	/** Map an event type onto the severity levels the filter offers. */
	function levelFor(type) {
		if (type.endsWith('_failed') || type === 'run_failed') return 'error';
		if (type.startsWith('http_') || type.endsWith('_retried')) return 'warn';
		if (type.startsWith('step_')) return 'info';
		return 'debug';
	}

	/** Render an event payload as a single readable line. */
	function messageFor(type, payload) {
		const node = payload?.node?.id ? ` ${payload.node.id}` : '';

		if (payload?.error) return `${type}${node}: ${payload.error}`;
		if (payload?.status) return `${type}${node} → HTTP ${payload.status}`;
		if (payload?.reason) return `${type}: ${payload.reason}`;

		return `${type}${node}`;
	}

	function toLogEntry(row) {
		const payload = typeof row.payload === 'string' ? safeParse(row.payload) : (row.payload ?? {});

		return {
			id: row.id,
			created_at: row.ts ?? row.created_at,
			level: levelFor(row.type),
			message: messageFor(row.type, payload)
		};
	}

	function safeParse(text) {
		try {
			return JSON.parse(text);
		} catch {
			return {};
		}
	}

	const filtered = $derived(
		logs.filter((log) => {
			if (filterLevel !== 'all' && log.level !== filterLevel) return false;
			if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
				return false;
			}
			return true;
		})
	);

	function scrollToBottom() {
		if (!autoScroll || !logsContainer) return;
		// Wait for the DOM to reflect the new entries before scrolling.
		requestAnimationFrame(() => {
			logsContainer.scrollTop = logsContainer.scrollHeight;
		});
	}

	onMount(() => {
		const source = new EventSource(`/api/runs/${runId}/events`);

		source.addEventListener('run_event', (message) => {
			// The first frames arrive before the stream goes quiet; clearing the
			// spinner on the first one avoids a flash for runs with no events.
			loading = false;
			logs = [...logs, toLogEntry(JSON.parse(message.data))];
			scrollToBottom();
		});

		source.addEventListener('done', () => {
			loading = false;
			// The run finished; no reconnect needed.
			source.close();
		});

		source.onopen = () => {
			loading = false;
			error = null;
		};

		source.onerror = () => {
			// EventSource retries on its own unless it is already closed.
			if (source.readyState === EventSource.CLOSED) {
				error = 'Connection to the log stream was lost.';
				loading = false;
			}
		};

		return () => source.close();
	});

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