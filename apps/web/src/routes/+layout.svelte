<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { page } from '$app/state';
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
	});

	// Track SPA navigations ($app/stores is gone in SvelteKit 3; $app/state is reactive)
	$effect(() => {
		const pathname = page.url?.pathname;
		if (pathname) trackPageView(pathname);
	});
</script>

<Header session={data?.session} />

<main>
	{@render children()}
</main>

<!-- Source link, the Profullstack webring and the copyright, rendered by +layout.server.js. -->
{@html data.footer}

<style>
	main {
		min-height: calc(100vh - 64px);
		background-color: var(--color-bg-primary);
		color: var(--color-text-primary);
	}
</style>