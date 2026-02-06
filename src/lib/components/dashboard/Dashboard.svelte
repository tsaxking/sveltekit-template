<!--
@component
Dashboard layout wrapper that renders cards grid.

**Props**
- `body`: `Snippet<[Dashboard.Card[]]>` — Render function for cards.
- `dashboard`: `Dashboard.Dashboard` — Dashboard controller.

**Example**
```svelte
<Dashboard {dashboard}>
	{#snippet body(cards)}
		{#each cards as card}
			<Card {card}>{#snippet body()}...{/snippet}</Card>
		{/each}
	{/snippet}
</Dashboard>
```
-->
<script lang="ts">
	import { capitalize } from 'ts-utils/text';
	import { onMount, type Snippet } from 'svelte';
	import MinimizedCards from './MinimizedCards.svelte';
	import { Dashboard } from '$lib/model/dashboard';

	interface Props {
		body: Snippet<[Dashboard.Card[]]>;
		dashboard: Dashboard.Dashboard;
	}

	const { body, dashboard }: Props = $props();

	const cards = $derived(dashboard.orderedCards);

	onMount(() => {
		dashboard.init();
	});
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
		{@render body($cards)}
	</div>
</div>

<style>
	:root {
		--grid-size: 12;
	}
</style>
