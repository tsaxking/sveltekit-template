<script lang="ts" generics="T">
	/* eslint-disable @typescript-eslint/no-explicit-any */

	import { onMount } from 'svelte';
	import {
		createGrid,
		ModuleRegistry,
		ClientSideRowModelModule,
		type GridOptions,
		themeQuartz,
		PaginationModule,
		type GridApi,
		type Module,
		ValidationModule,
		RowApiModule,
		QuickFilterModule,
		RowSelectionModule,
		RenderApiModule,
		EventApiModule,
		RowStyleModule,
		CellStyleModule,
		type ValueGetterParams,
		type ICellRendererParams
	} from 'ag-grid-community';
	import { EventEmitter } from 'ts-utils/event-emitter';
	import type { Readable } from 'svelte/store';
	import {
		CheckBoxSelectRenderer,
		HeaderCheckboxRenderer
	} from '$lib/utils/ag-grid/checkbox-select';

	interface Props {
		filter?: boolean;
		opts: Omit<GridOptions<T>, 'rowData'>;
		data: Readable<T[]>;
		style?: string;
		rowNumbers?:
			| boolean
			| {
					start: number;
			  };
		layer?: number;
		height: string | number;
		modules?: Module[];
		multiSelect?: boolean;
	}

	const {
		filter,
		opts,
		data,
		style,
		rowNumbers = false,
		layer = 1,
		height,
		modules = [],
		multiSelect = false
	}: Props = $props();

	$effect(() =>
		ModuleRegistry.registerModules([
			...modules,
			ClientSideRowModelModule,
			PaginationModule,
			ValidationModule,
			RowApiModule,
			QuickFilterModule,
			RowSelectionModule,
			RenderApiModule,
			EventApiModule,
			RowStyleModule,
			CellStyleModule
		])
	);

	const em = new EventEmitter<{
		filter: T[];
		init: HTMLDivElement;
		ready: GridApi<T>;
	}>();

	export const on = em.on.bind(em);
	export const off = em.off.bind(em);

	export const getGrid = () => grid;

	export const getSelection = (): T[] => {
		if (!grid) return [];
		const selected: T[] = [];

		grid.forEachNode((node) => {
			if ((node as any).checkboxSelected) {
				if (node.data) selected.push(node.data);
			}
		});

		return selected;
	};

	export const rerender = () => {
		if (grid) {
			grid.refreshCells();
		}
	};

	// Create a custom dark theme using Theming API
	const darkTheme = $derived(
		themeQuartz.withParams({
			backgroundColor: `var(--layer-${layer})`,
			browserColorScheme: 'dark',
			chromeBackgroundColor: {
				ref: 'foregroundColor',
				mix: 0.07,
				onto: 'backgroundColor'
			},
			foregroundColor: `var(--text-layer-${layer})`,
			headerFontSize: 14
		})
	);

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
								valueGetter: (params: ValueGetterParams<T>) => {
									if (typeof rowNumbers === 'object') {
										return rowNumbers.start + (params.node?.rowIndex || 0);
									} else {
										return (params.node?.rowIndex || 0) + 1;
									}
								},
								width: 50,
								suppressMovable: true,
								cellClass: 'text-center',
								cellStyle: {
									backgroundColor: 'var(--ag-chrome-background-color)'
								},
								cellRenderer: (params: ICellRendererParams<T>) => {
									const div = document.createElement('div');
									div.innerText = String(params.value);
									div.style.cursor = 'pointer';

									div.onclick = () => {
										const node = params.node as any;
										node.checkboxSelected = !node.checkboxSelected;
										params.api.refreshCells({ rowNodes: [params.node], force: true });
										params.api.refreshHeader();
									};

									return div;
								}
							}
						]
					: []),
				...(multiSelect
					? [
							{
								width: 50,
								cellRenderer: CheckBoxSelectRenderer,
								headerComponent: HeaderCheckboxRenderer
							}
						]
					: []),
				...opts.columnDefs
			],
			getRowClass: (params) => {
				return (params.node as any).checkboxSelected ? 'row-checked' : '';
			}
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
