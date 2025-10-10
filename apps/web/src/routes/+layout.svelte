<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';

	let { children, data } = $props();
</script>

<Header session={data?.session} />

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: calc(100vh - 64px);
	}
</style>