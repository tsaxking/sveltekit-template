<script lang="ts">
	import nav from '$lib/imports/admin';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';
	import { onMount } from 'svelte';
	import {
		createGrid,
		ModuleRegistry,
		ClientSideRowModelModule,
		type GridOptions,
		themeQuartz,
		PaginationModule,
		// type GridApi,
		QuickFilterModule,
		ValidationModule,
		RowAutoHeightModule,
		ColumnAutoSizeModule,
		TextFilterModule,
		NumberFilterModule
	} from 'ag-grid-community';

	// Register AG Grid Modules
	ModuleRegistry.registerModules([
		ClientSideRowModelModule,
		PaginationModule,
		QuickFilterModule,
		ValidationModule,
		RowAutoHeightModule,
		ColumnAutoSizeModule,
		TextFilterModule,
		NumberFilterModule
	]);

	const { data } = $props();
	const structs = $derived(data.structs);
	const d = $derived(data.data);
	const struct = $derived(data.struct);
	$inspect(d);

	nav();

	const darkTheme = themeQuartz.withParams({
		backgroundColor: '#212529',
		browserColorScheme: 'dark',
		chromeBackgroundColor: {
			ref: 'foregroundColor',
			mix: 0.07,
			onto: 'backgroundColor'
		},
		foregroundColor: '#FFF',
		headerFontSize: 14
	});

	let gridDiv: HTMLDivElement;
	// let grid: GridApi;
	onMount(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const gridOptions: GridOptions<any> = {
			theme: darkTheme, // Apply custom dark theme
			columnDefs: Object.entries(struct).map(([k, _v]) => {
				return {
					headerName: k,
					field: k
				};
			}),
			rowData: d,
			defaultColDef: {
				sortable: true,
				flex: 1,
				filter: true,
				autoHeight: true,
				wrapText: true
			},
			pagination: true,
			paginationPageSize: 100,
			paginationPageSizeSelector: [50, 100, 200],
			// ...additionalOptions

			autoSizeStrategy: {
				type: 'fitGridWidth'
			}
			// paginationAutoPageSize: true
		};

		if (gridDiv) {
			createGrid(gridDiv, gridOptions); // Create the grid with custom options
		}
	});
</script>

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
			<div style="height: 1000px;">
				<div bind:this={gridDiv} class="w-100 h-100"></div>
			</div>
		</div>
	</div>
</div>
