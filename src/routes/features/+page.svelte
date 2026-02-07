<script lang="ts">
	import Navbar from '$lib/components/general/Navbar.svelte';
	import nav from '$lib/nav/feature.js';
	import * as remote from '$lib/remotes/features.remote';
	import type { Feature } from '$lib/types/features';
	import { onMount } from 'svelte';
	nav();

	let features: Feature[] = $state([]);

	onMount(() => {
		remote.list().then((f) => (features = f));
	});
</script>

<Navbar title={__APP_ENV__.name} />
<div class="container layer-2">
	<div class="row mb-3">
		<div class="col">
			<h1>Features</h1>
			<small class="text-muted">
				View all features available in {__APP_ENV__.name} and their documentation. Click on a feature
				to view more details about it!
			</small>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col" style="max-height: 70vh; overflow-y: auto;">
			{#each features as feature (feature.id)}
				<a href={`/features/${feature.id}`} class="text-decoration-none">
					<div class="card h-100 border-1 border-info">
						<div class="card-body">
							<h5 class="card-title">{feature.name}</h5>
							<p class="card-text text-muted">{feature.description}</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>
