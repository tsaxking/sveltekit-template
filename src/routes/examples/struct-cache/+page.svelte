<!--
@component
Example struct cache page at `/examples/struct-cache`.
-->
<script lang="ts">
	import { Test } from '$lib/model/testing.svelte';
	import { onMount } from 'svelte';

	let data = $state(Test.Test.arr());

	onMount(() => {
		data = Test.Test.all({
			type: 'all',
			cache: {
				expires: new Date(Date.now() + 1000 * 60 * 5) // 5 minutes
			}
		});
	});
</script>

<button
	type="button"
	class="btn btn-primary"
	onclick={() => {
		Test.Test.new({
			name: 'Name - ' + Math.floor(Math.random() * 100),
			age: Math.floor(Math.random() * 100)
		});
	}}
>
	Make new stuff
</button>

{#each $data as d}
	<div>{d.data.name}</div>
{/each}
