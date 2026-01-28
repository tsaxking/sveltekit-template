<!--
@component
Root layout wrapper for all routes. Acts as middleware for global bootstrapping.
-->
<script>
	import { Struct } from '$lib/services/struct';
	import { browser } from '$app/environment';
	import '$lib/index';

	setTimeout(() => {
		if (browser) Struct.buildAll();
	});
	const { children } = $props();
</script>

<main>
	{@render children()}
</main>
