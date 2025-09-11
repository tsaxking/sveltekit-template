<script lang="ts">
	import { Test } from '$lib/model/testing.svelte.js';

	const { data } = $props();

	const d = $derived(Test.Test.arr(data.data.map((d) => Test.Test.Generator(d))));
</script>

{#each $d as item}
	<p>{item.data.name} | {item.data.age}</p>
{/each}
