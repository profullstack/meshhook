<script>
	/**
	 * Event timeline component
	 * Displays chronological list of workflow execution events
	 */

	let { events = [] } = $props();

	const eventIcons = {
		node_start: '▶️',
		node_complete: '✅',
		node_error: '❌',
		workflow_start: '🚀',
		workflow_complete: '🏁',
		workflow_error: '💥'
	};

	const eventColors = {
		node_start: '#3b82f6',
		node_complete: '#10b981',
		node_error: '#ef4444',
		workflow_start: '#8b5cf6',
		workflow_complete: '#10b981',
		workflow_error: '#ef4444'
	};

	function formatTime(timestamp) {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	}

	function getEventIcon(eventType) {
		return eventIcons[eventType] || '📌';
	}

	function getEventColor(eventType) {
		return eventColors[eventType] || '#6b7280';
	}
</script>

<div class="event-timeline">
	<h3>Event Timeline</h3>

	{#if events.length === 0}
		<p class="empty-message">No events yet</p>
	{:else}
		<div class="timeline">
			{#each events as event (event.id)}
				<div class="timeline-item">
					<div class="timeline-marker" style="background-color: {getEventColor(event.event_type)}">
						<span class="event-icon">{getEventIcon(event.event_type)}</span>
					</div>
					<div class="timeline-content">
						<div class="event-header">
							<span class="event-type">{event.event_type.replace(/_/g, ' ')}</span>
							<span class="event-time">{formatTime(event.created_at)}</span>
						</div>
						{#if event.node_id}
							<p class="event-detail">Node: {event.node_id}</p>
						{/if}
						{#if event.data}
							<details class="event-data">
								<summary>Event Data</summary>
								<pre>{JSON.stringify(event.data, null, 2)}</pre>
							</details>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.event-timeline {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e0e0e0;
	}

	h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.empty-message {
		text-align: center;
		color: #999;
		padding: 2rem;
	}

	.timeline {
		position: relative;
		padding-left: 2rem;
	}

	.timeline::before {
		content: '';
		position: absolute;
		left: 1rem;
		top: 0;
		bottom: 0;
		width: 2px;
		background: #e0e0e0;
	}

	.timeline-item {
		position: relative;
		padding-bottom: 1.5rem;
	}

	.timeline-item:last-child {
		padding-bottom: 0;
	}

	.timeline-marker {
		position: absolute;
		left: -1.5rem;
		top: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.event-icon {
		font-size: 0.875rem;
	}

	.timeline-content {
		background: #f8f9fa;
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid #e0e0e0;
	}

	.event-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.event-type {
		font-weight: 600;
		color: #333;
		text-transform: capitalize;
		font-size: 0.875rem;
	}

	.event-time {
		font-size: 0.75rem;
		color: #666;
		font-family: monospace;
	}

	.event-detail {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
	}

	.event-data {
		margin-top: 0.75rem;
	}

	.event-data summary {
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		color: #4075a6;
	}

	.event-data summary:hover {
		text-decoration: underline;
	}

	.event-data pre {
		margin: 0.5rem 0 0 0;
		padding: 0.75rem;
		background: #1e1e1e;
		color: #d4d4d4;
		border-radius: 4px;
		font-size: 0.75rem;
		overflow-x: auto;
	}
</style>