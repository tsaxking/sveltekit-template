<!--
@component
Range component test page at `/test/component/range`.
-->
<script lang="ts">
	import { RangeSlider } from '$lib/utils/form';
	import { onMount } from 'svelte';
	let target: HTMLDivElement;

	onMount(() => {
		const range = new RangeSlider({
			min: 0,
			max: 100,
			step: 1,
			target
		});

		return range.render();
	});
</script>

<div bind:this={target} style="width: 100%; height: 40px;"></div>
