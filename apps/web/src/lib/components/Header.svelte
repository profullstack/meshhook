<script>
	import { page } from '$app/stores';

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
				<img src="/logo.black.svg" alt="MeshHook Logo" class="logo-image" />
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
		background: white;
		border-bottom: 1px solid #e0e0e0;
		position: sticky;
		top: 0;
		z-index: 100;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		padding: 0.5rem 0;
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
		color: #333;
		font-weight: 600;
		font-size: 1.25rem;
		transition: opacity 0.2s;
	}

	.logo a:hover {
		opacity: 0.8;
	}

	.logo-image {
		height: 64px;
		width: auto;
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
		color: #666;
		font-weight: 500;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.nav-link:hover {
		background: #f5f5f5;
		color: #333;
	}

	.nav-link.active {
		background: var(--color-theme-1, #0066cc);
		color: white;
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-email {
		color: #666;
		font-size: 0.875rem;
	}

	.btn-logout,
	.btn-login {
		padding: 0.5rem 1rem;
		border: 1px solid #e0e0e0;
		background: white;
		color: #333;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.btn-logout:hover,
	.btn-login:hover {
		background: #f5f5f5;
		border-color: #ccc;
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

		.logo-image {
			height: 56px;
		}
		
		.logo-text {
			display: none;
		}
	}
</style>