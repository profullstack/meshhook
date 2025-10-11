<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { theme } from '$lib/stores/themes';
	import { createClient } from '$lib/supabase';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(async () => {
		if (data?.session) {
			const supabase = createClient();
			await theme.loadFromSupabase(supabase);
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