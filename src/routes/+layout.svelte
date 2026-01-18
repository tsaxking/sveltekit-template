<script>
	import { Struct } from '$lib/services/struct';
	import { browser } from '$app/environment';
	import '$lib/index';
	import { _init } from '$lib/services/db';

	setTimeout(() => {
		if (browser) {
			Struct.buildAll();
			try {
				_init();
			} catch {
				//
			}
		}
	});
	const { children } = $props();
</script>

<main>
	{@render children()}
</main>
