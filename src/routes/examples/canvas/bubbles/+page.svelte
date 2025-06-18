<script lang="ts">
	import { render } from '$lib/canvas/bubbles';
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		render(canvas);
	});
</script>

<canvas bind:this={canvas} style="width: 100%; aspect-ratio: 2/1;" width="1000" height="500"
></canvas>
