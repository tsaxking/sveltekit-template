<!--
@component
Struct pagination test page at `/test/struct/pagination`.
-->
<script lang="ts">
	import Grid from '$lib/components/general/Grid.svelte';
	import { Test } from '$lib/model/testing.svelte';
	import { onMount } from 'svelte';

	let data = $state(Test.Test.pagination());

	onMount(() => {
		data = Test.Test.all({
			type: 'pagination',
			pagination: {
				page: 0,
				size: 10
			}
		});
	});
</script>

<button
	type="button"
	class="btn btn-primary"
	onclick={() => {
		Array.from({ length: 100 }).map((_, i) => {
			Test.Test.new({
				name: `Test ${i}`,
				age: i
			});
		});
	}}
>
	Make lots of data
</button>

<button type="button" class="btn btn-primary" onclick={() => data.prev()}> Prev </button>
<button type="button" class="btn btn-primary" onclick={() => data.next()}> Next </button>

{#key data}
	<Grid
		{data}
		opts={{
			columnDefs: [
				{
					field: 'data.name',
					headerName: 'Name'
				},
				{
					field: 'data.age',
					headerName: 'Age'
				}
			]
		}}
		height="400px"
	/>
{/key}
