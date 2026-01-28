<!--
@component
Permissions test page at `/test/permissions`.
-->
<script lang="ts">
	import { Test } from '$lib/model/testing.svelte';
	import { onMount } from 'svelte';

	let arr = $state(Test.TestPermissions.arr());

	onMount(() => {
		arr = Test.TestPermissions.all({
			type: 'all'
		});
	});
</script>

<ul class="list-group">
	{#each $arr as data}
		<li class="p-3 mb-2 bg-light border list-group-item">{data.data.name} - {data.data.age}</li>
	{/each}
</ul>
