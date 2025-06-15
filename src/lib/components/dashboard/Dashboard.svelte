<script lang="ts">
	import { capitalize } from 'ts-utils/text';
	import { type Snippet } from 'svelte';
	import MinimizedCards from './MinimizedCards.svelte';
	import { Dashboard } from '$lib/model/dashboard';

	interface Props {
		body: Snippet;
		dashboard: Dashboard.Dashboard;
	}

	const { body, dashboard }: Props = $props();
</script>

<div class="container-fluid layer-1">
	<h1>{capitalize(dashboard.name)}</h1>
	<MinimizedCards {dashboard} />
	<div
		style="
		display: grid; 
		grid-template-columns: repeat(var(--grid-size), 1fr) !important;
		gap: 10px;
	"
		class="p-3"
	>
		{@render body()}
	</div>
</div>

<style>
	:root {
		--grid-size: 12;
	}
</style>
