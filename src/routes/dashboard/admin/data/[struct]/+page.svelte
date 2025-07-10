<script lang="ts">
	import nav from '$lib/imports/admin';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';
	import {
		QuickFilterModule,
		ValidationModule,
		RowAutoHeightModule,
		ColumnAutoSizeModule,
		TextFilterModule,
		NumberFilterModule
	} from 'ag-grid-community';
	import Grid from '$lib/components/general/Grid.svelte';


	const { data } = $props();
	const structs = $derived(data.structs);
	const struct = $derived(data.struct);
	const d = $derived(data.data);

	$inspect(d);

	nav();
</script>

<svelte:head>
	<title>Admin Edit: {struct.data.name}</title>
</svelte:head>

<div class="container-fluid">
	<div class="row mb-3">
		<div class="col">
			<div style="overflow-x: auto; white-space: nowrap; display: flex;">
				{#each structs as struct}
					<button
						class="btn btn-primary me-3"
						onclick={() => {
							location.href = `/dashboard/admin/data/${struct}`;
						}}
					>
						{capitalize(fromSnakeCase(struct))}
					</button>
				{/each}
			</div>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<Grid 
				opts={{}}
				data={d}
				height="calc(100vh - 200px)"
				modules={[
					QuickFilterModule,
					ValidationModule,
					RowAutoHeightModule,
					ColumnAutoSizeModule,
					TextFilterModule,
					NumberFilterModule
				]}
			/>
		</div>
	</div>
</div>
