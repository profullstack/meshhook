<script>
	/**
	 * HttpResponseViewer Component
	 * 
	 * Displays HTTP response data in a tabbed interface similar to browser dev tools.
	 * Shows Headers, Request, Response, and Timing information.
	 */
	let { response, request, error } = $props();
	
	let activeTab = $state('response');
	
	const tabs = [
		{ id: 'response', label: 'Response', icon: '📄' },
		{ id: 'headers', label: 'Headers', icon: '📋' },
		{ id: 'request', label: 'Request', icon: '📤' },
		{ id: 'timing', label: 'Timing', icon: '⏱️' }
	];
	
	/**
	 * Format JSON with syntax highlighting
	 */
	function formatJson(data) {
		if (!data) return '';
		try {
			if (typeof data === 'string') {
				return JSON.stringify(JSON.parse(data), null, 2);
			}
			return JSON.stringify(data, null, 2);
		} catch (e) {
			return String(data);
		}
	}
	
	/**
	 * Get response size in human-readable format
	 */
	function getResponseSize(data) {
		if (!data) return '0 B';
		const str = typeof data === 'string' ? data : JSON.stringify(data);
		const bytes = new Blob([str]).size;
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}
	
	/**
	 * Get status color based on HTTP status code
	 */
	function getStatusColor(status) {
		if (!status) return 'gray';
		if (status >= 200 && status < 300) return 'green';
		if (status >= 300 && status < 400) return 'blue';
		if (status >= 400 && status < 500) return 'orange';
		return 'red';
	}
</script>

<div class="response-viewer">
	{#if error}
		<div class="error-banner">
			<span class="error-icon">⚠️</span>
			<div class="error-content">
				<strong>Request Failed</strong>
				<p>{error.message || error}</p>
			</div>
		</div>
	{/if}
	
	{#if response}
		<div class="response-summary">
			<div class="summary-item">
				<span class="label">Status:</span>
				<span class="status-badge" style="background-color: var(--status-{getStatusColor(response.status)})">
					{response.status} {response.statusText || ''}
				</span>
			</div>
			<div class="summary-item">
				<span class="label">Time:</span>
				<span class="value">{response.timing?.duration || 0}ms</span>
			</div>
			<div class="summary-item">
				<span class="label">Size:</span>
				<span class="value">{getResponseSize(response.data)}</span>
			</div>
		</div>
	{/if}
	
	<div class="tabs">
		{#each tabs as tab}
			<button
				class="tab"
				class:active={activeTab === tab.id}
				onclick={() => activeTab = tab.id}
			>
				<span class="tab-icon">{tab.icon}</span>
				{tab.label}
			</button>
		{/each}
	</div>
	
	<div class="tab-content">
		{#if activeTab === 'response'}
			<div class="content-section">
				{#if response?.data}
					<div class="content-header">
						<h3>Response Body</h3>
						<button
							class="copy-btn"
							onclick={() => navigator.clipboard.writeText(formatJson(response.data))}
							title="Copy to clipboard"
						>
							📋 Copy
						</button>
					</div>
					<pre class="code-block">{formatJson(response.data)}</pre>
				{:else}
					<div class="empty-state">No response data</div>
				{/if}
			</div>
		{:else if activeTab === 'headers'}
			<div class="content-section">
				<div class="headers-group">
					<h3>Response Headers</h3>
					{#if response?.headers && Object.keys(response.headers).length > 0}
						<table class="headers-table">
							<tbody>
								{#each Object.entries(response.headers) as [key, value]}
									<tr>
										<td class="header-name">{key}</td>
										<td class="header-value">{value}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<div class="empty-state">No headers</div>
					{/if}
				</div>
				
				<div class="headers-group">
					<h3>Request Headers</h3>
					{#if request?.headers && Object.keys(request.headers).length > 0}
						<table class="headers-table">
							<tbody>
								{#each Object.entries(request.headers) as [key, value]}
									<tr>
										<td class="header-name">{key}</td>
										<td class="header-value">{value}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<div class="empty-state">No headers</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'request'}
			<div class="content-section">
				<div class="request-info">
					<div class="info-row">
						<span class="label">URL:</span>
						<code class="value">{request?.url || 'N/A'}</code>
					</div>
					<div class="info-row">
						<span class="label">Method:</span>
						<span class="method-badge">{request?.method || 'GET'}</span>
					</div>
				</div>
				
				{#if request?.body}
					<div class="content-header">
						<h3>Request Body</h3>
						<button
							class="copy-btn"
							onclick={() => navigator.clipboard.writeText(formatJson(request.body))}
							title="Copy to clipboard"
						>
							📋 Copy
						</button>
					</div>
					<pre class="code-block">{formatJson(request.body)}</pre>
				{:else}
					<div class="empty-state">No request body</div>
				{/if}
			</div>
		{:else if activeTab === 'timing'}
			<div class="content-section">
				<div class="timing-info">
					{#if response?.timing}
						<div class="timing-row">
							<span class="label">Total Duration:</span>
							<span class="value">{response.timing.duration}ms</span>
						</div>
						{#if response.timing.dns}
							<div class="timing-row">
								<span class="label">DNS Lookup:</span>
								<span class="value">{response.timing.dns}ms</span>
							</div>
						{/if}
						{#if response.timing.connect}
							<div class="timing-row">
								<span class="label">Connection:</span>
								<span class="value">{response.timing.connect}ms</span>
							</div>
						{/if}
						{#if response.timing.ttfb}
							<div class="timing-row">
								<span class="label">Time to First Byte:</span>
								<span class="value">{response.timing.ttfb}ms</span>
							</div>
						{/if}
					{:else}
						<div class="empty-state">No timing information available</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.response-viewer {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: white;
		border-radius: 8px;
		overflow: hidden;
	}
	
	.error-banner {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #fee;
		border-bottom: 2px solid #fcc;
		color: #c33;
	}
	
	.error-icon {
		font-size: 1.5rem;
	}
	
	.error-content strong {
		display: block;
		margin-bottom: 0.25rem;
	}
	
	.error-content p {
		margin: 0;
		font-size: 0.875rem;
	}
	
	.response-summary {
		display: flex;
		gap: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.summary-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.summary-item .label {
		font-size: 0.875rem;
		color: #666;
		font-weight: 500;
	}
	
	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
	}
	
	:global(:root) {
		--status-green: #10b981;
		--status-blue: #3b82f6;
		--status-orange: #f59e0b;
		--status-red: #ef4444;
		--status-gray: #6b7280;
	}
	
	.tabs {
		display: flex;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.tab {
		padding: 0.75rem 1.5rem;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		font-size: 0.875rem;
		font-weight: 500;
		color: #666;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.tab:hover {
		background: #fff;
		color: #333;
	}
	
	.tab.active {
		background: white;
		color: var(--color-theme-1, #4075a6);
		border-bottom-color: var(--color-theme-1, #4075a6);
	}
	
	.tab-icon {
		font-size: 1rem;
	}
	
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}
	
	.content-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	
	.content-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}
	
	.copy-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.copy-btn:hover {
		background: #f5f5f5;
		border-color: #ccc;
	}
	
	.code-block {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		padding: 1rem;
		overflow-x: auto;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		margin: 0;
	}
	
	.empty-state {
		padding: 2rem;
		text-align: center;
		color: #999;
		font-style: italic;
	}
	
	.headers-group {
		margin-bottom: 1.5rem;
	}
	
	.headers-group h3 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	
	.headers-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	
	.headers-table tr {
		border-bottom: 1px solid #f0f0f0;
	}
	
	.headers-table tr:last-child {
		border-bottom: none;
	}
	
	.header-name {
		padding: 0.5rem;
		font-weight: 600;
		color: #666;
		width: 30%;
		vertical-align: top;
	}
	
	.header-value {
		padding: 0.5rem;
		color: #333;
		word-break: break-all;
	}
	
	.request-info {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		padding: 1rem;
	}
	
	.info-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	
	.info-row:last-child {
		margin-bottom: 0;
	}
	
	.info-row .label {
		font-weight: 600;
		color: #666;
		min-width: 80px;
	}
	
	.info-row .value {
		flex: 1;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		color: #333;
	}
	
	.method-badge {
		padding: 0.25rem 0.75rem;
		background: #3b82f6;
		color: white;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}
	
	.timing-info {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		padding: 1rem;
	}
	
	.timing-row {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 0;
		border-bottom: 1px solid #e0e0e0;
	}
	
	.timing-row:last-child {
		border-bottom: none;
	}
	
	.timing-row .label {
		font-weight: 500;
		color: #666;
	}
	
	.timing-row .value {
		font-weight: 600;
		color: #333;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}
</style>