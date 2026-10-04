<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/stores';
	import { trackPageView, identifyUser } from '$lib/utils/analytics.js';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	// Track page views on navigation
	onMount(() => {
		// Track initial page view
		trackPageView();

		// Identify user if logged in
		if (data?.session?.user) {
			identifyUser({
				id: data.session.user.id,
				email: data.session.user.email
			});
		}

		// Subscribe to page changes for SPA navigation
		const unsubscribe = page.subscribe(($page) => {
			if ($page.url?.pathname) {
				trackPageView($page.url.pathname);
			}
		});

		return () => {
			unsubscribe();
		};
	});
</script>

<Header session={data?.session} />

<main>
	{@render children()}
</main>

<footer class="site-footer">
	<nav class="webring" aria-label="Profullstack webring">
		<a
			href="https://rssamplifier.com/ring/profullstack/previous?from=https%3A%2F%2Fmeshhook.com%2F"
			rel="prev">&lt;&lt;</a
		>
		<a href="https://rssamplifier.com/ring/profullstack">Profullstack</a>
		<a href="https://rssamplifier.com/ring/profullstack/next?from=https%3A%2F%2Fmeshhook.com%2F" rel="next"
			>&gt;&gt;</a
		>
	</nav>
</footer>

<style>
	main {
		min-height: calc(100vh - 64px);
		background-color: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.site-footer {
		padding: 16px;
		border-top: 1px solid var(--color-border-primary);
		background-color: var(--color-bg-primary);
		font-size: 0.8125rem;
	}

	.webring {
		display: flex;
		justify-content: center;
		gap: 12px;
	}

	.webring a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.webring a:hover {
		color: var(--color-text-primary);
		text-decoration: underline;
	}
</style>