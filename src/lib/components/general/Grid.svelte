<!--
@component
AG Grid wrapper with optional filter input and selection helpers.
See AG Grid docs: https://www.ag-grid.com/javascript-data-grid/getting-started/

**Props**
- `filter`?: `boolean` — Show quick filter input.
- `opts`: `Omit<GridOptions<T>, 'rowData'>` — Grid options without row data.
- `data`: `Readable<T[]>` — Store of row data.
- `style`?: `string` — Additional container styles.
- `rowNumbers`?: `boolean | { start: number }` — Show row numbers.
- `layer`?: `number` — Theme layer for CSS variables.
- `height`: `string | number` — Grid height.
- `modules`?: `Module[]` — Extra AG Grid modules.
- `multiSelect`?: `boolean` — Enable checkbox selection.

**Exports**
- `on(event)`: subscribe to `'filter' | 'init' | 'ready'` events.
- `off(event)`: unsubscribe.
- `getGrid()`: return the grid API instance.
- `getSelection()`: return selected rows.
- `rerender()`: refresh visible cells.

**Example**
```svelte
<Grid
	{data}
	opts={{
		columnDefs: [
			{ field: 'name', sortable: true, filter: true },
			{ field: 'status', valueFormatter: (p) => String(p.value ?? '') }
		],
		defaultColDef: { resizable: true, flex: 1 },
		rowSelection: 'single',
		animateRows: true
	}}
	height="400px"
/>
```
-->
<script lang="ts" generics="T">
	/* eslint-disable @typescript-eslint/no-explicit-any */

	import { onMount } from 'svelte';
	import {
		createGrid,
		ModuleRegistry,
		ClientSideRowModelModule,
		type GridOptions,
		themeBalham,
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
	import { EventEmitter } from 'ts-utils';

	interface Props {
		opts: Omit<GridOptions<T>, 'rowData'>;
		data: T[];
		style?: string;
		rowNumbers?:
			| boolean
			| {
					start: number;
			  };
		layer?: number;
		height: string | number;
		modules?: Module[];
		debug?: boolean;
		redraw_on_update?: boolean;
	}

	const {
		opts,
		data,
		style,
		rowNumbers = false,
		layer = 1,
		height,
		modules = [],
		debug,
		redraw_on_update
	}: Props = $props();
	// $inspect('data', data);

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

	const log = (...args: unknown[]) => {
		if (debug) {
			console.log('[Grid API]', ...args);
		}
	};

	export const on = em.on.bind(em);
	export const off = em.off.bind(em);

	export const getGrid = () => grid;

	export const getContainer = () => gridDiv;

	export const getSortedNodes = (): T[] => {
		const nodes: T[] = [];
		if (!grid) return nodes;

		// Get all rendered nodes in their current order
		grid.forEachNodeAfterFilterAndSort((node) => {
			if (node.data) nodes.push(node.data);
		});

		return nodes;
	};

	export const getSelection = (): T[] => {
		if (!grid) return [];
		const selected: T[] = [];

		const selectedNodes = grid.getSelectedRows();
		for (const row of selectedNodes) {
			if (row) selected.push(row);
		}

		return selected;
	};

	export const rerender = (params?: { force?: boolean; suppressFlash?: boolean }) => {
		if (grid) {
			grid.refreshCells(params);
		}
	};

	// Create a custom dark theme using Theming API
	const gridTheme = $derived(
		themeBalham.withParams({
			backgroundColor: `var(--layer-${layer})`,
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
	const transientRowKeys = new WeakMap<object, string>();
	let transientRowKeySeed = 0;

	const getRowKey = (row: T, index?: number) => {
		const candidate = row as T & { id?: string | number; raw?: { id?: string | number } };
		const explicitId = candidate.id ?? candidate.raw?.id;
		if (explicitId !== undefined && explicitId !== null && explicitId !== '') {
			return String(explicitId);
		}

		if (typeof row === 'object' && row !== null) {
			const existing = transientRowKeys.get(row as object);
			if (existing) return existing;

			const created = `__grid_row_${index ?? transientRowKeySeed++}`;
			transientRowKeys.set(row as object, created);
			return created;
		}

		return `__grid_primitive_${String(row)}_${index ?? transientRowKeySeed++}`;
	};

	const gridOptions: GridOptions<T> = $derived({
		theme: gridTheme,
		...opts,
		rowData: [],
		getRowId: (params) => getRowKey(params.data),
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
			...(opts.columnDefs || [])
		],
		getRowClass: (params) => {
			return (params.node as any).checkboxSelected ? 'row-checked' : '';
		}
	});

	const redrawNode = (index: number) => {
		if (!grid) return;
		log('Redrawing node at index:', index);
		const rowNode = grid.getRowNode(getRowKey(data[index], index));
		if (rowNode) {
			rowNode.setData(data[index]);
			grid.refreshCells({ rowNodes: [rowNode], force: true });
			return true;
		}
		return false;
	};

	// used to copy objects with circular references safely
	const getCircularReplacer = (data: unknown) => {
		const seen = new WeakSet();
		return JSON.stringify(data, (_key: string, value: unknown) => {
			if (typeof value === 'object' && value !== null) {
				if (seen.has(value)) {
					return ''; // Drops the circular reference
				}
				seen.add(value);
			}
			return value;
		});
	};

	const static_data = $derived(data.map(getCircularReplacer));
	let prev_static_data: string[] = $state([]);

	const applyData = () => {
		if (!grid) return;
		log('Applying data to the grid');
		grid.setGridOption('rowData', data);
	};

	$effect(() => {
		log('Applying data changes to the grid');
		let rendered = false;
		if (data.length !== prev_static_data.length) {
			rendered = true;
			applyData();
		} else {
			const max = Math.max(static_data.length, prev_static_data.length);
			for (let i = 0; i < max; i++) {
				if (static_data[i] !== prev_static_data[i]) {
					if (redraw_on_update) {
						applyData();
						break;
					}
					rendered = redrawNode(i) || rendered;
				}
			}
			if (!rendered) {
				applyData();
			}
		}

		if (rendered) {
			prev_static_data = data.map(getCircularReplacer);
		}
	});

	$effect(() => {
		log('Grid options changed:', gridOptions);
		if (gridDiv) {
			grid?.destroy();
			grid = createGrid(gridDiv, gridOptions);
			em.emit('ready', grid);
		}
	});

	onMount(() => {
		if (!opts.columnDefs) {
			throw new Error('Column definitions are required');
		}
		em.emit('init', gridDiv);

		return () => {
			grid.destroy();
		};
	});
</script>

<div
	bind:this={gridDiv}
	style={`
		${style};
		height: ${typeof height === 'number' ? `${height}px` : height};
	`}
></div>
