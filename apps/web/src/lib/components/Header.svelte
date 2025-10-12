<script>
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte'; // Import ThemeToggle

	let { session } = $props();

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/workflows', label: 'Workflows' },
		{ href: '/runs', label: 'Runs' },
		{ href: '/secrets', label: 'Secrets' }
	];

	function isActive(href) {
		if (href === '/') {
			return $page.url.pathname === '/';
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<header class="header">
	<div class="container">
		<div class="logo">
			<a href="/">
				<span class="logo-icon">🪝</span>
				<span class="logo-text">MeshHook</span>
			</a>
		</div>

		<nav class="nav">
			{#each navItems as item}
				<a href={item.href} class="nav-link" class:active={isActive(item.href)}>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="user-menu">
			<!-- Add ThemeToggle here -->
			<ThemeToggle />
			
			{#if session?.user}
				<span class="user-email">{session.user.email}</span>
				<form action="/auth/logout" method="POST">
					<button type="submit" class="btn-logout">Logout</button>
				</form>
			{:else}
				<a href="/auth/login" class="btn-login">Login</a>
			{/if}
		</div>
	</div>
</header>

<style>
	.header {
		background: var(--color-nav-bg);
		border-bottom: 1px solid var(--color-nav-border);
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: var(--shadow-sm);
		transition: background-color var(--transition-normal), border-color var(--transition-normal);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 64px;
	}

	.logo a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-nav-text);
		font-weight: 600;
		font-size: 1.25rem;
		transition: opacity var(--transition-fast);
	}

	.logo a:hover {
		opacity: 0.8;
	}

	.logo-icon {
		font-size: 1.5rem;
	}

	.logo-text {
		font-weight: 700;
	}

	.nav {
		display: flex;
		gap: 0.5rem;
		flex: 1;
		justify-content: center;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		text-decoration: none;
		color: var(--color-text-secondary);
		font-weight: 500;
		border-radius: 4px;
		transition: all var(--transition-fast);
	}

	.nav-link:hover {
		background: var(--color-nav-hover);
		color: var(--color-nav-text);
	}

	.nav-link.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-email {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.btn-logout,
	.btn-login {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		transition: all var(--transition-fast);
		font-size: 0.875rem;
	}

	.btn-logout:hover,
	.btn-login:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-hover);
	}

	@media (max-width: 768px) {
		.container {
			padding: 0 1rem;
		}

		.nav {
			gap: 0.25rem;
		}

		.nav-link {
			padding: 0.5rem 0.75rem;
			font-size: 0.875rem;
		}

		.user-email {
			display: none;
		}

		.logo-text {
			display: none;
		}
	}
</style>