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
			A webhook-first, deterministic, Postgres-native workflow engine that delivers n8n's visual
			simplicity and Temporal's durability without restrictive licensing.
		</p>
	</section>

	{#if data.session}
		<section class="user-info">
			<p>Logged in as: {data.session.user.email}</p>
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
		padding: 2rem;
	}

	h1 {
		font-size: 3rem;
		margin-bottom: 2rem;
	}

	.intro {
		margin-bottom: 3rem;
		font-size: 1.2rem;
		line-height: 1.6;
	}

	.user-info,
	.auth {
		padding: 2rem;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	nav {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	nav a,
	.button {
		padding: 0.75rem 1.5rem;
		background: var(--color-theme-1);
		color: white;
		border-radius: 4px;
		text-decoration: none;
		transition: background 0.2s;
	}

	nav a:hover,
	.button:hover {
		background: var(--color-theme-2);
		text-decoration: none;
	}
</style>