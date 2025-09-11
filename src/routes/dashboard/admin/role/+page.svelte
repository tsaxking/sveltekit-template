<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import Modal from '$lib/components/bootstrap/Modal.svelte';
	import Grid from '$lib/components/general/Grid.svelte';
	import RoleSelect from '$lib/components/roles/RoleSelect.svelte';
	import { Permissions } from '$lib/model/permissions.js';
	import { contextmenu } from '$lib/utils/contextmenu.js';
	import { alert } from '$lib/utils/prompts.js';
	import { onMount } from 'svelte';
	import nav from '$lib/imports/admin.js';
	import {
		TextFilterModule,
		NumberFilterModule,
		DateFilterModule,
		CustomFilterModule
	} from 'ag-grid-community';

	nav();

	const { data } = $props();

	const roles = $derived(data.roles);

	type Row = {
		role: Permissions.RoleData;
		parent: Permissions.RoleData | undefined;
	};

	let gridContainer: HTMLDivElement;
	let grid: Grid<Row>;
	let distanceToTop = $state(0);
	let parent: Permissions.RoleData | undefined = $state(undefined);

	let createRoleData = $state({
		name: '',
		description: '',
		color: '#000000'
	});

	const startCreateRole = () => {
		createModal.show();
	};

	const createRole = () => {
		createModal.hide();
		Permissions.Role.new({
			...createRoleData,
			parent: parent?.data.id || ''
		});
	};

	onMount(() => {
		const rect = gridContainer.getBoundingClientRect();
		distanceToTop = rect.top;

		// createModal.show();

		// return () => createModal.hide();
	});

	let createModal: Modal;
</script>

<div class="container-fluid">
	<div class="row mb-3">
		<div class="col">
			<h1>Roles</h1>
		</div>
	</div>

	<div class="row mb-3">
		<div class="col-12">
			<button type="button" class="btn btn-primary" onclick={startCreateRole}>
				<i class="material-icons">add</i>
				Create Role
			</button>
		</div>
	</div>

	<div class="row mb-3">
		<div class="col-12" bind:this={gridContainer}>
			<Grid
				bind:this={grid}
				data={roles}
				modules={[TextFilterModule, NumberFilterModule, DateFilterModule, CustomFilterModule]}
				opts={{
					columnDefs: [
						{
							headerName: 'Role',
							field: 'role.data.name',
							filter: true
						},
						{
							headerName: 'Description',
							field: 'role.data.description',
							filter: true
						},
						{
							headerName: 'Parent',
							// field: 'role.data.parent.data.name',
							valueGetter: (params) => {
								return params.data?.parent?.data.name || 'No Parent';
							},
							filter: true
						},
						{
							headerName: 'Created',
							field: 'role.data.created',
							cellRenderer: (params: any) => new Date(params.value).toLocaleString(),
							filter: true
						},
						{
							headerName: 'Updated',
							field: 'role.data.updated',
							cellRenderer: (params: any) => new Date(params.value).toLocaleString(),
							filter: true
						}
					],
					onCellContextMenu: (params) => {
						contextmenu(params.event as PointerEvent, {
							options: [
								{
									action: () => {
										location.href = `/dashboard/admin/role/${params.data?.role.data.id}`;
									},
									name: `View ${params.data?.role.data.name}`,
									icon: {
										type: 'material-icons',
										name: 'visibility'
									}
								}
							],
							width: '300px'
						});
					},
					preventDefaultOnContextMenu: true,
					onRowDoubleClicked: (params) => {
						location.href = `/dashboard/admin/role/${params.data?.role.data.id}`;
					}
				}}
				height="calc(100vh - {distanceToTop}px)"
				rowNumbers={true}
			/>
		</div>
	</div>
</div>

<Modal bind:this={createModal} title="Create Role" size="lg">
	{#snippet body()}
		<div class="form-floating mb-3">
			<input
				type="text"
				class="form-control"
				id="role-name"
				placeholder="My Role Name"
				bind:value={createRoleData.name}
			/>
			<label for="role-name">Role Name</label>
		</div>
		<div class="form-floating mb-3">
			<input
				type="text"
				class="form-control"
				id="role-description"
				placeholder="My Role Description"
				bind:value={createRoleData.description}
			/>
			<label for="role-description">Description</label>
		</div>
		{#if parent}
			<p>Selected:</p>
			<div class="card layer-3">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-middle">
						<h5 class="card-title">
							{parent.data.name}
						</h5>
						<button type="button" class="btn" onclick={() => (parent = undefined)}>
							<i class="material-icons">close</i>
						</button>
					</div>
				</div>
			</div>
		{/if}
		<RoleSelect
			onselect={(r) => {
				if (!r.data.id) {
					return alert(
						'You cannot read the id property of this role, you cannot create a role with it as its parent.'
					);
				}
				parent = r;
			}}
		/>
	{/snippet}
	{#snippet buttons()}
		<button type="button" class="btn btn-secondary" onclick={() => createModal.hide()}>
			Cancel
		</button>
		<button type="button" class="btn btn-primary" onclick={createRole}> Create Role </button>
	{/snippet}
</Modal>
