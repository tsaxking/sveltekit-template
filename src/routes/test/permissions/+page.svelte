<script lang="ts">
	import { Test } from '$lib/model/testing.svelte';
	import { onMount } from 'svelte';

	let arr = $state(Test.TestPermissions.arr());

	onMount(() => {
		arr = Test.TestPermissions.all(false);
	});
</script>

{#each $arr as data}
	<div>{data.data.name} - {data.data.age}</div>
{/each}
