<!--
@component
Client-side struct example page at `/examples/struct/csr`.
-->
<script lang="ts">
	import { Test } from '$lib/model/testing.svelte';
	import { onMount } from 'svelte';

	let data = $state(Test.Test.arr());

	onMount(() => {
		data = Test.Test.all({
			type: 'all'
		});
	});
</script>

{#each $data as item}
	<p>{item.data.name} | {item.data.age}</p>
{/each}
