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
	<span>&copy; {new Date().getFullYear()} Profullstack, Inc.</span>
	<a href="https://github.com/profullstack/meshhook">Source</a>
</footer>

<style>
	main {
		min-height: calc(100vh - 64px);
		background-color: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.site-footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.25rem 1.25rem;
		padding: 1.25rem 1rem;
		border-top: 1px solid var(--color-border-primary);
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		background-color: var(--color-bg-primary);
	}

	.site-footer a {
		color: inherit;
	}
</style>