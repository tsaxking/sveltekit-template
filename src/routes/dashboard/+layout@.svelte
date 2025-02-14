<script lang="ts">
	import Navbar from '$lib/components/general/Navbar.svelte';
	import { PUBLIC_APP_NAME } from '$env/static/public';
	import { onMount } from 'svelte';

	const { children } = $props();

	let name = $state('');

	onMount(() => {
		[, , name] = location.pathname.split('/');
	});
</script>

<main class="dashboard">
	<Navbar title={PUBLIC_APP_NAME} />

	{@render children()}
</main>
