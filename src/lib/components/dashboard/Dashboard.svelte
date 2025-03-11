<script lang="ts">
	import { capitalize } from 'ts-utils/text';
	import { onMount, type Snippet } from 'svelte';
	import MinimizedCards from './MinimizedCards.svelte';
	import { browser } from '$app/environment';
	import { Dashboard } from '$lib/model/dashboard';

	interface Props {
		body: Snippet;
		dashboard: Dashboard.Dashboard;
	}

	const { body, dashboard }: Props = $props();
</script>

<div>
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
		--grid-size: 5; /* Default for extra-large screens */
	}

	@media (max-width: 1200px) {
		:root {
			--grid-size: 4; /* Large screens */
		}
	}

	@media (max-width: 992px) {
		:root {
			--grid-size: 3; /* Medium screens */
		}
	}

	@media (max-width: 768px) {
		:root {
			--grid-size: 2; /* Small screens */
		}
	}

	@media (max-width: 576px) {
		:root {
			--grid-size: 1 !important; /* Extra small screens */
		}
	}
</style>
