<script lang="ts" generics="T">
	import { onMount } from 'svelte';
	import {
		createGrid,
		ModuleRegistry,
		ClientSideRowModelModule,
		type GridOptions,
		themeQuartz,
		PaginationModule,
		type GridApi,
		QuickFilterModule,
		ValidationModule,
		RowAutoHeightModule,
		ColumnAutoSizeModule,
		TextFilterModule,
		NumberFilterModule,
		RowApiModule,
		NumberEditorModule,
		RenderApiModule,
		ScrollApiModule,
		SelectEditorModule,
		TextEditorModule,
		CustomEditorModule,
		CellStyleModule,
		DateEditorModule
	} from 'ag-grid-community';
	import { EventEmitter } from 'ts-utils/event-emitter';
	import type { Readable } from 'svelte/store';

	// Register AG Grid Modules
	ModuleRegistry.registerModules([
		ClientSideRowModelModule,
		PaginationModule,
		QuickFilterModule,
		ValidationModule,
		RowAutoHeightModule,
		ColumnAutoSizeModule,
		TextFilterModule,
		NumberFilterModule,
		RowApiModule,
		NumberEditorModule,
		RenderApiModule,
		ScrollApiModule,
		SelectEditorModule,
		TextEditorModule,
		CustomEditorModule,
		CellStyleModule,
		DateEditorModule
	]);

	interface Props {
		filter?: boolean;
		opts: Omit<GridOptions<T>, 'rowData'>;
		data: Readable<T[]>;
		style?: string;
		rowNumbers?: boolean;
		layer?: number;
		height: number | `${number}${'px' | 'vh' | 'rem' | 'em' | '%'}` | 'auto';
	}

	const { filter, opts, data, style, rowNumbers = false, layer = 1, height }: Props = $props();

	const em = new EventEmitter<{
		filter: T[];
		init: HTMLDivElement;
		ready: GridApi<T>;
	}>();

	export const on = em.on.bind(em);
	export const off = em.off.bind(em);

	export const getGrid = () => grid;

	// Create a custom dark theme using Theming API
	const darkTheme = themeQuartz.withParams({
		backgroundColor: `var(--layer-${layer})`,
		browserColorScheme: 'dark',
		chromeBackgroundColor: {
			ref: 'foregroundColor',
			mix: 0.07,
			onto: 'backgroundColor'
		},
		foregroundColor: `var(--text-layer-${layer})`,
		headerFontSize: 14
	});

	let gridDiv: HTMLDivElement;
	let grid: GridApi<T>;
	let filterText: string = $state('');
	let filterTimeout: ReturnType<typeof setTimeout> | null = null;

	const onDataFilter = () => {
		if (filterTimeout) {
			clearTimeout(filterTimeout);
		}
		filterTimeout = setTimeout(() => {
			grid.setGridOption('quickFilterText', filterText);
			const nodes = grid
				.getRenderedNodes()
				.map((n) => n.data)
				.filter(Boolean);
			em.emit('filter', nodes);
		}, 300);
	};

	onMount(() => {
		if (!opts.columnDefs) {
			throw new Error('Column definitions are required');
		}
		em.emit('init', gridDiv); // Emit the init event with the grid container
		const gridOptions: GridOptions<T> = {
			theme: darkTheme,
			...opts,
			rowData: $data,
			columnDefs: [
				...(rowNumbers
					? [
							{
								headerName: '',
								valueGetter: 'node.rowIndex + 1',
								width: 50,
								suppressMovable: true,
								cellClass: 'text-center',
								cellStyle: {
									backgroundColor: 'var(--ag-chrome-background-color)'
								}
							}
						]
					: []),
				...opts.columnDefs
			]
		};
		grid = createGrid(gridDiv, gridOptions); // Create the grid with custom options
		em.emit('ready', grid); // Emit the ready event with the grid API

		return data.subscribe((r) => {
			grid.setGridOption('rowData', r); // Set the row data from the provided store
			onDataFilter();
		});
	});
</script>

<!-- Grid Container -->
{#if filter}
	<div class="col-md-8">
		<div class="filter-container">
			<input
				type="text"
				id="filter-text-box"
				class="form-control me-2"
				placeholder="Filter..."
				oninput={onDataFilter}
				bind:value={filterText}
			/>
		</div>
	</div>
{/if}
<div
	bind:this={gridDiv}
	style={`
		${style};
		height: ${typeof height === 'number' ? `${height}px` : height};
	`}
></div>
