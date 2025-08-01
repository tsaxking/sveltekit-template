<script lang="ts">
	import Grid from '$lib/components/general/Grid.svelte';
	import { Account } from '$lib/model/account.js';
	import { type ICellRendererParams } from 'ag-grid-community';
	import { onMount } from 'svelte';
	import { dateTime } from 'ts-utils/clock';
	import { Permissions } from '$lib/model/permissions.js';
	import { writable } from 'svelte/store';
	import { contextmenu } from '$lib/utils/contextmenu.js';

	const { data } = $props();
	const accounts = $derived(writable(data.accounts));
	const total = $derived(data.total);
	const page = $derived(data.page);
	const limit = $derived(data.limit);

	type Row = {
		account: Account.AccountData;
		roles: Permissions.RoleData[];
	};

	let grid: Grid<Row>;
	let gridContainer: HTMLDivElement;

	const rerender = () => grid.rerender();

	let distanceToTop = $state(0);

	onMount(() => {
		const rect = gridContainer.getBoundingClientRect();
		distanceToTop = rect.top;
	});
</script>

<svelte:head>
	<title>Admin Accounts</title>
	<meta name="description" content="Manage user accounts in the admin dashboard." />
</svelte:head>

<div class="container-fluid">
	<div class="row mb-3">
		<div class="col-12">
			<h1 class="mb-3">Manage Accounts</h1>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col-12" bind:this={gridContainer}>
			<Grid
				bind:this={grid}
				opts={{
					columnDefs: [
						{
							field: 'account.data.username',
							headerName: 'Username'
						},
						{
							field: 'account.data.email',
							headerName: 'Email'
						},
						{
							field: 'account.data.firstName',
							headerName: 'First Name'
						},
						{
							field: 'account.data.lastName',
							headerName: 'Last Name'
						},
						// {
						// 	headerName: 'Picture',
						// 	cellRenderer: (params: ICellRendererParams<Row>) => {
						// 		return `<img src="${params.data?.account.data.picture}" alt="Profile Picture" style="width: 50px; height: 50px; border-radius: 50%;">`;
						// 	}
						// },
						{
							headerName: 'Verified',
							cellRenderer: (params: ICellRendererParams<Row>) => {
								return params.data?.account.data.verified ? 'Yes' : 'No';
							}
						},
						{
							headerName: 'Created',
							cellRenderer: (params: ICellRendererParams<Row>) => {
								return dateTime(params.data?.account.data.created);
							}
						},
						{
							headerName: 'Last Login',
							cellRenderer: (params: ICellRendererParams<Row>) => {
								return dateTime(params.data?.account.data.lastLogin);
							}
						},
						{
							headerName: 'Roles',
							cellRenderer: (params: ICellRendererParams<Row>) => {
								return params.data?.roles.map((role) => role.data.name).join(', ') || 'None';
							}
						}
					],
					onCellContextMenu: (params) => {
						contextmenu(params.event as PointerEvent, {
							options: [
								`Manage ${params.data?.account.data.username}`,
								{
									action: () => {},
									name: 'Change Roles',
									icon: {
										type: 'material-icons',
										name: 'manage_accounts'
									}
								},
								{
									action: () =>
										params.data?.account.update((d) => ({
											...d,
											verified: !d.verified
										})),
									name: params.data?.account.data.verified ? 'Unverify Account' : 'Verify Account',
									icon: {
										type: 'material-icons',
										name: params.data?.account.data.verified ? 'cancel' : 'check_circle'
									}
								},
								{
									action: () => {},
									name: 'View Profile',
									icon: {
										type: 'material-icons',
										name: 'account_circle'
									}
								}
							],
							width: '150px'
						});
					},
					preventDefaultOnContextMenu: true
				}}
				data={accounts}
				height="calc(100vh - {distanceToTop}px)"
				rowNumbers={true}
				multiSelect={true}
			/>
		</div>
	</div>
</div>
