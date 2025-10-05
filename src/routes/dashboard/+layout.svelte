<script lang="ts">
	import Navbar from '$lib/components/general/Navbar.svelte';

	const { children } = $props();
</script>

<main class="dashboard">
	<Navbar title={__APP_ENV__.name} />

	{@render children()}
</main>
