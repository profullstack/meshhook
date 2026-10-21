<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>MeshHook - Workflow Engine</title>
	<meta name="description" content="Webhook-first, deterministic workflow engine" />
</svelte:head>

<div class="container">
	<h1>Welcome to MeshHook</h1>

	<section class="intro">
		<p>
			A webhook-first, deterministic, SQLite-native workflow engine that delivers n8n's visual
			simplicity and Temporal's durability without restrictive licensing.
		</p>
	</section>

	{#if data.user}
		<section class="user-info">
			<p>Logged in as: {data.user.email}</p>
			<nav>
				<a href="/workflows">Workflows</a>
				<a href="/runs">Runs</a>
				<a href="/secrets">Secrets</a>
			</nav>
		</section>
	{:else}
		<section class="auth">
			<p>Please sign in to continue</p>
			<a href="/auth/login" class="button">Sign In</a>
		</section>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3rem 2rem;
		min-height: calc(100vh - 64px);
	}

	h1 {
		font-size: 3rem;
		margin-bottom: 1.5rem;
		color: var(--color-text-primary);
		font-weight: 700;
	}

	.intro {
		margin-bottom: 3rem;
		font-size: 1.25rem;
		line-height: 1.7;
		color: var(--color-text-secondary);
		max-width: 800px;
	}

	.user-info,
	.auth {
		padding: 2rem;
		background-color: var(--color-card-bg);
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		border: 1px solid var(--color-card-border);
	}

	.user-info p,
	.auth p {
		color: var(--color-text-primary);
		margin-bottom: 1rem;
	}

	nav {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	nav a,
	.button {
		padding: 0.75rem 1.5rem;
		background-color: var(--color-button-primary);
		color: var(--color-text-inverse);
		border-radius: 8px;
		text-decoration: none;
		font-weight: 500;
		transition: background-color var(--transition-fast);
	}

	nav a:hover,
	.button:hover {
		background-color: var(--color-button-primary-hover);
		text-decoration: none;
	}
</style>