<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { theme } from '$lib/stores/themes';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(async () => {
		// Load theme from server if user is logged in
		if (data?.session) {
			await theme.loadFromServer();
		}
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