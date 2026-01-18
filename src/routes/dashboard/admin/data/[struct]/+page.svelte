<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import Grid from '$lib/components/general/Grid.svelte';
	import { capitalize, fromCamelCase, fromSnakeCase } from 'ts-utils/text';
	import { ButtonCellRenderer } from '$lib/utils/ag-grid/buttons.js';
	import {
		CellStyleModule,
		CheckboxEditorModule,
		NumberEditorModule,
		TextEditorModule,
		TooltipModule,
		type ValueGetterParams,
		type EditableCallbackParams,
		type ValueSetterParams,
		type ICellRendererParams
	} from 'ag-grid-community';
	import { dateTime } from 'ts-utils/clock';
	import { contextmenu } from '$lib/utils/contextmenu.js';
	import { copy } from '$lib/utils/clipboard.js';
	import { useCommandStack } from '$lib/services/event-stack.js';
	import { onDestroy, onMount } from 'svelte';
	import { StructData, type Blank } from '$lib/services/struct';
	import { confirm, notify, prompt } from '$lib/utils/prompts.js';
	import Modal from '$lib/components/bootstrap/Modal.svelte';
	import { match } from 'ts-utils/match';
	import Flatpickr from '$lib/components/forms/Flatpickr.svelte';
	import nav from '$lib/imports/admin';
	import { v4 as uuid } from 'uuid';
	import { StructDataStage } from '$lib/services/struct';

	nav();

	const { data } = $props();

	const cs = $derived(useCommandStack('admin-data-' + data.struct, onMount, onDestroy));

	const structType = $derived(data.structType);
	const struct = $derived(data.struct);
	const structData = $derived(data.data);
	const total = $derived(data.total);
	const safes = $derived(data.safes);
	const page = $derived(data.page);
	const limit = $derived(data.limit);

	let newData: Record<string, unknown> = $state({});

	const globalCols = [
		'id',
		'created',
		'updated',
		'archived',
		'attributes',
		'lifetime',
		'canUpdate'
	];

	const deleteItem = async (item: StructData<Blank>) => {
		if (await confirm('Are you sure you want to delete this item? This cannot be undone.')) {
			item.delete();
		}
	};

	let grid: Grid<StructData<Blank>>;
	let createModal: Modal;
	let editModal: Modal;
	// svelte-ignore state_referenced_locally
	let editStage: StructDataStage<Blank> = $state(new StructDataStage(struct.Generator({}) as any));
	let query = $state('');
	let column = $state<string | null>(null);

	const newItem = () => {
		createModal.show();
	};

	const edit = (data: StructData<Blank>) => {
		editModal.show();
		editStage = new StructDataStage(data as any);
	};

	const saveEdit = () => {
		editStage.save({
			strategy: 'force',
			createIfDeleted: false
		});
	};

	const resetEdit = () => {
		editStage = new StructDataStage(struct.Generator({}) as any);
	};

	const genUUID = () => {
		copy(uuid(), true);
	};

	const create = async () => {
		createModal.hide();
		const res = await struct.new(newData);
		if (res.isOk()) {
			if (res.value.success) {
				notify({
					title: `Created`,
					color: 'success',
					textColor: 'light',
					message: `Data created for ${struct.data.name}`,
					autoHide: 3000
				});
			} else {
				notify({
					title: 'Error',
					color: 'danger',
					textColor: 'light',
					message: `Server responded with error: ${res.value.message}`
				});
			}
		} else {
			console.error('Error creating data:', res.error);
			notify({
				title: 'Error',
				color: 'danger',
				textColor: 'light',
				message: `Server responded with error: ${res.error.message}`
			});
		}
	};

	let distanceToTop = $state(0);

	const next = () => {
		if (page * limit >= total) return;
		location.href = `/dashboard/admin/data/${data.struct.data.name}?page=${page + 1}&limit=${limit}`;
	};
	const prev = () => {
		if (page > 0) {
			location.href = `/dashboard/admin/data/${data.struct.data.name}?page=${page - 1}&limit=${limit}`;
		}
	};

	const clearTable = async () => {
		const res = await prompt(
			`This will delete all data in this table. Type ${struct.data.name} to confirm.`
		);

		if (res === struct.data.name) {
			struct.clear();
		}
	};

	const search = (query: string, column: string | null) => {
		const url = new URL(location.href);
		url.searchParams.set('page', '0');
		if (query.trim() === '') {
			url.searchParams.delete('search');
			url.searchParams.delete('column');
		} else {
			url.searchParams.set('search', query);
			if (column) {
				url.searchParams.set('column', column);
			} else {
				url.searchParams.delete('column');
			}
		}
		location.href = url.toString();
	};

	onMount(() => {
		const rect = gridContainer.getBoundingClientRect();
		distanceToTop = rect.top;

		Object.entries(struct.data.structure).map(([key, type]) => {
			(newData as any)[key] = match(type)
				.case('string', () => '')
				.case('number', () => 0)
				.case('date', () => new Date().toISOString())
				.case('boolean', () => false)
				.exec()
				.unwrap();
		});

		const url = new URL(location.href);
		if (url.searchParams.get('search')) {
			query = url.searchParams.get('search') || '';
		}
		if (url.searchParams.get('column')) {
			column = url.searchParams.get('column') || null;
		}
		// setTimeout(() => createModal.show());

		// return () => createModal.hide();
	});

	let gridContainer: HTMLDivElement;
</script>

<svelte:head>
	<title>Admin - {capitalize(fromSnakeCase(data.struct.data.name))} Data</title>
</svelte:head>

<div class="container-fluid">
	<div class="row mb-3">
		<div class="col-md-12">
			<h1>
				{capitalize(fromSnakeCase(data.struct.data.name))} Data
			</h1>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col-4">
			<div class="d-flex justify-content-between align-items-center">
				<p class="ps-2">
					{$structData.length > 0 ? 'Showing' : 'No'}
					{$structData.length} of {total} rows
					<br />
					(Page {page + 1} / {Math.ceil(total / limit) || 1})
				</p>
				<button type="button" class="btn" onclick={prev} disabled={page <= 0}>
					<i class="material-icons">navigate_before</i>
				</button>
				<button type="button" class="btn" onclick={next} disabled={page * limit >= total}>
					<i class="material-icons">navigate_next</i>
				</button>
				<div class="form-floating" style="width: 150px;">
					<select
						name="floating-limit"
						id="limit"
						class="form-select"
						onchange={(e) => {
							const newLimit = parseInt((e.target as HTMLSelectElement).value, 10);
							location.href = `/dashboard/admin/data/${data.struct.data.name}?page=0&limit=${newLimit}`;
						}}
						value={limit}
					>
						{#each [10, 25, 50, 100, 250, 500] as lim}
							<option value={lim}>{lim}</option>
						{/each}
					</select>
					<label for="limit"> Rows per page </label>
				</div>
			</div>
		</div>
		<div class="col-4">
			<div class="d-flex w-100 justify-content-end pe-2">
				<button type="button" class="btn btn-primary" onclick={newItem}>
					<i class="material-icons">add</i>
					New
				</button>
			</div>
		</div>
		<div class="col-4">
			<div class="d-flex w-100 justify-content-end pe-2">
				<button type="button" class="btn btn-danger" onclick={clearTable}>
					<i class="material-icons">delete_sweep</i>
					Clear Table
				</button>
			</div>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<div class="input-group">
				<div class="form-floating" style="width: 200px;">
					<select name="floating-column" id="column" class="form-select" bind:value={column}>
						<option value="" selected>All Columns</option>
						{#each Object.entries(structType).filter(([k]) => !safes?.includes(k)) as [key, _value]}
							<option value={key}>{capitalize(fromCamelCase(key))}</option>
						{/each}
					</select>
					<label for="column"> Column </label>
				</div>
				<input
					type="text"
					class="form-control"
					placeholder="Search..."
					aria-label="Search"
					bind:value={query}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							search(query, column);
						}
					}}
				/>
				<button
					class="btn btn-outline-secondary"
					type="button"
					onclick={() => search(query, column)}
				>
					<i class="material-icons">search</i>
				</button>
			</div>
		</div>
	</div>
	<div class="row mb-3" bind:this={gridContainer}>
		<Grid
			bind:this={grid}
			opts={{
				columnDefs: [
					{
						headerName: 'Actions',
						width: 80,
						cellRenderer: ButtonCellRenderer,
						cellRendererParams: {
							buttons: [
								{
									html: `<i class="material-icons">delete</i>`,
									onClick: (data: ICellRendererParams<StructData<Blank>>) => {
										if (data.data) deleteItem(data.data);
									},
									className: 'btn btn-danger',
									title: 'Delete'
								}
							]
						}
					},
					...Object.entries(structType)
						.filter(([k]) => !safes?.includes(k))
						.map(([key, _value]) => ({
							field: ('data.' + key) as any,
							headerName: capitalize(fromCamelCase(key)),
							valueGetter: ['created', 'updated'].includes(key)
								? (params: ValueGetterParams<StructData<Blank>>) =>
										dateTime(new Date(String(params.data?.data[key])))
								: key === 'attributes'
									? (params: ValueGetterParams<StructData<Blank>>) =>
											(JSON.parse(params.data?.data.attributes || '[]') as string[]).join(', ')
									: undefined,
							editable: (params: EditableCallbackParams<StructData<Blank>>) => {
								const isStatic = ['id', 'created', 'updated', 'canUpdate'].includes(key);
								if (isStatic) return false;
								if (key === 'canUpdate') return true;
								if (!params.data?.data.canUpdate) return false;
								return true;
							},
							valueSetter: (params: ValueSetterParams<StructData<Blank>>) => {
								const isStatic = ['id', 'created', 'updated'].includes(key);
								if (isStatic) return false;

								if (key === 'canUpdate') {
									// Cannot update static fields
									return false;
								}

								cs.execute({
									label: 'Update ' + params.data.data.id + ' ' + key,
									do: () => {
										if (key === 'attributes') {
											params.data.setAttributes(
												String(params.newValue)
													.split(',')
													.map((a) => a.trim())
											);
											return;
										}
										params.data.update((d) => ({
											...d,
											[key]: params.newValue
										}));
									},
									undo: () => {
										if (key === 'attributes') {
											params.data.setAttributes(
												String(params.oldValue)
													.split(',')
													.map((a) => a.trim())
											);
											return;
										}
										params.data.update((d) => ({
											...d,
											[key]: params.oldValue
										}));
									}
								});

								return true;
							},
							// tooltipValueGetter: (params: any) => {
							//     if (key === 'attributes') {
							//         return JSON.stringify(JSON.parse(params.data.data.attributes), null, 2);
							//     }
							//     return params.data.data[key];
							// },
							tooltipField: ('data.' + key) as any
						}))
				],
				onCellContextMenu: (params) => {
					// return;
					contextmenu(params.event as PointerEvent, {
						options: [
							'Cell Actions',
							{
								name: 'Copy Value',
								action: () => {
									copy(params.value, true);
								},
								icon: {
									type: 'material-icons',
									name: 'content_copy'
								}
							},
							'Row Actions',
							{
								name: 'Duplicate',
								action: () => {},
								icon: {
									type: 'material-icons',
									name: 'add'
								}
							},
							{
								name: 'Edit',
								action: () => {
									if (params.data) edit(params.data);
								},
								icon: {
									type: 'material-icons',
									name: 'edit'
								}
							},
							{
								name: params.data?.data.archived ? 'Unarchive' : 'Archive',
								action: params.data?.data.archived
									? () => {
											cs.execute({
												label: 'Unarchive ' + params.data?.data.id,
												do: () => {
													params.data?.setArchive(false);
												},
												undo: () => {
													params.data?.setArchive(true);
												}
											});
										}
									: () => {
											cs.execute({
												label: 'Archive ' + params.data?.data.id,
												do: () => {
													params.data?.setArchive(true);
												},
												undo: () => {
													params.data?.setArchive(false);
												}
											});
										},
								icon: {
									type: 'material-icons',
									name: params.data?.data.archived ? 'unarchive' : 'archive'
								}
							},
							{
								name: 'Delete Row',
								action: () => {
									if (params.data) deleteItem(params.data);
								},
								icon: {
									type: 'material-icons',
									name: 'delete'
								}
							}
						],
						width: '200px'
					});
				},
				preventDefaultOnContextMenu: true,
				tooltipMouseTrack: true,
				tooltipShowDelay: 1000
			}}
			data={structData}
			height="calc(100vh - {distanceToTop}px)"
			modules={[
				NumberEditorModule,
				CheckboxEditorModule,
				TextEditorModule,
				CellStyleModule,
				TooltipModule
			]}
			rowNumbers={{
				start: page * limit + 1
			}}
			multiSelect={true}
		/>
	</div>
</div>

<Modal bind:this={createModal} title="Create New Item" size="lg">
	{#snippet body()}
		<div class="container-fluid">
			{#each Object.entries(structType).filter(([k]) => !globalCols.includes(k)) as [key, value]}
				<div class="row mb-3">
					{#if value === 'text'}
						<div class="form-floating">
							<input
								type="text"
								class="form-control"
								id="create-{key}"
								placeholder="Placeholder"
								bind:value={newData[key]}
							/>
							<label for="create-{key}" class="ms-3">
								{capitalize(fromCamelCase(key))}
							</label>
						</div>
					{:else if value === 'date'}
						<div class="form-floating">
							<Flatpickr
								value={new Date()}
								onChange={(date) => {
									(newData as any)[key] = date.toISOString();
								}}
								className="form-control"
								options={{ dateFormat: 'Y-m-d' }}
								id="create-{key}"
							/>
							<label for="create-{key}" class="ms-3">{capitalize(fromCamelCase(key))}</label>
						</div>
					{:else if value === 'number'}
						<div class="form-floating">
							<input
								type="number"
								class="form-control"
								id="create-{key}"
								placeholder="Placeholder"
								bind:value={newData[key]}
							/>
							<label for="create-{key}" class="ms-3">
								{capitalize(fromCamelCase(key))}
							</label>
						</div>
					{:else if value === 'boolean'}
						<div class="form-label mb-2">{capitalize(fromCamelCase(key))}</div>
						<div class="btn-group" role="group" aria-label="Boolean toggle">
							<input
								type="radio"
								class="btn-check"
								name="btnradio-{key}"
								id="btnradio-{key}-true"
								autocomplete="off"
								checked={(newData as any)[key] === true}
								onchange={() => ((newData as any)[key] = true)}
							/>
							<label class="btn btn-outline-primary" for="btnradio-{key}-true">True</label>

							<input
								type="radio"
								class="btn-check"
								name="btnradio-{key}"
								id="btnradio-{key}-false"
								autocomplete="off"
								checked={(newData as any)[key] === false}
								onchange={() => ((newData as any)[key] = false)}
							/>
							<label class="btn btn-outline-primary" for="btnradio-{key}-false">False</label>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/snippet}

	{#snippet buttons()}
		<button type="button" class="btn btn-secondary" onclick={genUUID}>
			<i class="material-icons">content_copy</i>
			Generate Id
		</button>
		<button
			type="button"
			class="btn btn-secondary"
			onclick={() => {
				newData = {};
				createModal.hide();
			}}
		>
			Cancel
		</button>
		<button class="btn btn-primary" onclick={create}> Create </button>
	{/snippet}
</Modal>

<Modal bind:this={editModal} title="Edit Item" size="lg">
	{#snippet body()}
		<div class="container-fluid">
			{#key editStage}
				{#each Object.entries(structType).filter(([k]) => !globalCols.includes(k)) as [key, value]}
					<div class="row mb-3">
						{#if value === 'text'}
							<div class="form-floating">
								<input
									type="text"
									class="form-control"
									id="create-{key}"
									placeholder="Placeholder"
									bind:value={editStage.data[key]}
								/>
								<label for="create-{key}" class="ms-3">
									{capitalize(fromCamelCase(key))}
								</label>
							</div>
						{:else if value === 'date'}
							<div class="form-floating">
								<Flatpickr
									value={editStage.data[key] as Date}
									onChange={(date) => {
										(editStage.data as any)[key] = date;
									}}
									className="form-control"
									options={{ dateFormat: 'Y-m-d' }}
									id="create-{key}"
								/>
								<label for="create-{key}" class="ms-3">{capitalize(fromCamelCase(key))}</label>
							</div>
						{:else if value === 'number'}
							<div class="form-floating">
								<input
									type="number"
									class="form-control"
									id="create-{key}"
									placeholder="Placeholder"
									bind:value={editStage.data[key]}
								/>
								<label for="create-{key}" class="ms-3">
									{capitalize(fromCamelCase(key))}
								</label>
							</div>
						{:else if value === 'boolean'}
							<div class="form-label mb-2">{capitalize(fromCamelCase(key))}</div>
							<div class="btn-group" role="group" aria-label="Boolean toggle">
								<input
									type="radio"
									class="btn-check"
									name="btnradio-{key}"
									id="btnradio-{key}-true"
									autocomplete="off"
									checked={(editStage.data as any)[key] === true}
									onchange={() => ((editStage.data as any)[key] = true)}
								/>
								<label class="btn btn-outline-primary" for="btnradio-{key}-true">True</label>

								<input
									type="radio"
									class="btn-check"
									name="btnradio-{key}"
									id="btnradio-{key}-false"
									autocomplete="off"
									checked={(editStage.data as any)[key] === false}
									onchange={() => ((editStage.data as any)[key] = false)}
								/>
								<label class="btn btn-outline-primary" for="btnradio-{key}-false">False</label>
							</div>
						{/if}
					</div>
				{/each}
			{/key}
		</div>
	{/snippet}

	{#snippet buttons()}
		<button type="button" class="btn btn-secondary" onclick={genUUID}>
			<i class="material-icons">content_copy</i>
			Generate Id
		</button>
		<button
			type="button"
			class="btn btn-warning"
			onclick={() => {
				editStage.rollback();
			}}
		>
			Restore
		</button>
		<button
			type="button"
			class="btn btn-secondary"
			onclick={() => {
				resetEdit();
				editModal.hide();
			}}
		>
			Cancel
		</button>
		<button class="btn btn-primary" onclick={saveEdit}> Save </button>
	{/snippet}
</Modal>
