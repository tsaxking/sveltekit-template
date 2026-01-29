<!--
@component
Dashboard layout for `/dashboard` routes. Acts as middleware for dashboard pages.

Wraps all dashboard views with shared navigation and styling expectations. This
layout isolates dashboard-specific UI from the public site layout.
-->
<script lang="ts">
	import Navbar from '$lib/components/general/Navbar.svelte';

	const { children } = $props();
</script>

<main class="dashboard">
	<Navbar title={__APP_ENV__.name} />

	{@render children()}
</main>
