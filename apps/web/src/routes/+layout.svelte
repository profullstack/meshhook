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

<style>
	main {
		min-height: calc(100vh - 64px);
		background-color: var(--color-bg-primary);
		color: var(--color-text-primary);
	}
</style>