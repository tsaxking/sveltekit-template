<script lang="ts">
	import { capitalize } from 'ts-utils/text';
	import { onMount, type Snippet } from 'svelte';
	import MinimizedCards from './MinimizedCards.svelte';
	import { browser } from '$app/environment';

	interface Props {
		title: string;
		body: Snippet;
	}

	const { title, body }: Props = $props();

	// let gridSize = $state(12);
	let resizeTimeout: number | undefined;

	const updateGridSize = () => {
		if (!browser) return;
		let gridSize = 0;
		if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
		resizeTimeout = requestAnimationFrame(() => {
			const width = window.innerWidth;
			switch (true) {
				case width < 576:
					gridSize = 4;
					break;
				case width < 768:
					gridSize = 8;
					break;
				case width < 992:
					gridSize = 12;
					break;
				case width < 1200:
					gridSize = 16;
					break;
				default:
					gridSize = 20;
					break;
			}

			document.documentElement.style.setProperty("--grid-size", String(gridSize));
		});
	};

	updateGridSize();
	onMount(() => {
		window.addEventListener("resize", updateGridSize);
		return () => window.removeEventListener("resize", updateGridSize);
	});
</script>

<div>
	<h1>{capitalize(title)}</h1>
	<MinimizedCards />
	<div style="
		display: grid; 
		grid-template-columns: repeat(var(--grid-size), 1fr);
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