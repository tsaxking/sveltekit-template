<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import nav from '$lib/imports/admin.js';
	import Grid from '$lib/components/general/Grid.svelte';
	import RoleEditor from '$lib/components/roles/RoleRulesetEditor.svelte';
	import { Permissions } from '$lib/model/permissions';
	import { Account } from '$lib/model/account.js';
	import { contextmenu } from '$lib/utils/contextmenu.js';
	import { alert } from '$lib/utils/prompts.js';

	nav();

	const { data } = $props();
	const role = $derived(data.role);
	const children = $derived(data.children);
	const members = $derived(data.members);
</script>

<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h1>
				<i class="material-icons" style="color: {$role.color};"> person </i>
				Role: {$role.name}
			</h1>
			<p class="text-muted">View and manage the details of this role.</p>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<label for="" class="form-label">Name</label>
			<input
				type="text"
				name="role-name"
				id="role-name"
				class="form-control h6"
				value={$role.name}
				onchange={(e) => {
					role.update((d) => ({ ...d, name: e.currentTarget.value }));
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<label for="role-description" class="form-label">Description</label>
			<input
				type="text"
				name="role-description"
				id="role-description"
				value={$role.description}
				class="form-control"
				onchange={(e) => {
					role.update((d) => ({ ...d, description: e.currentTarget.value }));
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<label for="role-color" class="form-label">Color</label>
			<input
				type="color"
				name="role-color"
				id="role-color"
				value={$role.color}
				class="form-control form-control-color"
				onchange={(e) => {
					role.update((d) => ({ ...d, color: e.currentTarget.value }));
				}}
			/>
		</div>
	</div>
	{#if $role.parent !== ''}
		<div class="row mb-3">
			<div class="col">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						window.location.href = `/dashboard/admin/role/${$role.parent}`;
					}}
				>
					<i class="material-icons"> person </i>
					Go To Parent Role
				</button>
			</div>
		</div>
	{/if}
</div>

<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h2>Children</h2>
			<p class="text-muted">View and manage the child roles of this role.</p>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<Grid
				data={children}
				height="400px"
				rowNumbers={true}
				opts={{
					columnDefs: [
						{
							cellRenderer: (params: any) =>
								`<i class="material-icons" style="color: ${params.data?.data.color};">person</i>`,
							width: 60
						},
						{
							headerName: 'Name',
							field: 'data.name'
						},
						{
							headerName: 'Description',
							field: 'data.description'
						},
						{
							headerName: 'Created',
							field: 'data.created',
							cellRenderer: (params: any) => new Date(params.value).toLocaleString()
						},
						{
							headerName: 'Updated',
							field: 'data.updated',
							cellRenderer: (params: any) => new Date(params.value).toLocaleString()
						}
					],
					onRowDoubleClicked: (params) => {
						window.location.href = `/dashboard/admin/role/${params.data?.data.id}`;
					}
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col-6">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const res = await Permissions.createChildRolePopup(role);
					if (res.isErr()) {
						console.error('Failed to create child role:', res.error);
						return;
					}
					const data = res.value;
					if (!data.success) {
						console.error('Failed to create child role:', data.message);
						return alert('Error: ' + data.message || 'Failed to create child role');
					}
				}}
			>
				<i class="material-icons">add</i>
				Create Child Role
			</button>
		</div>
	</div>
</div>

<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h2>Rules</h2>
			<p class="text-muted">Manage the permissions assigned to this role.</p>
		</div>
	</div>
	<div class="row mb-3">
		<RoleEditor {role} saveOnChange={true} />
	</div>
</div>

<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h2>Members</h2>
			<p class="text-muted">View and manage the members assigned to this role.</p>
		</div>
	</div>
	<div class="row mb-3">
		<Grid
			data={members}
			height="400px"
			rowNumbers={true}
			opts={{
				columnDefs: [
					{
						headerName: 'Username',
						field: 'account.data.username'
					},
					{
						headerName: 'Email',
						field: 'account.data.email'
					},
					{
						headerName: 'First Name',
						field: 'account.data.firstName'
					},
					{
						headerName: 'Last Name',
						field: 'account.data.lastName'
					},
					{
						headerName: 'Date Joined',
						field: 'roleAccount.data.created',
						cellRenderer: (params: any) => new Date(params.value).toLocaleString()
					}
				],
				preventDefaultOnContextMenu: true,
				onCellContextMenu: (params) => {
					contextmenu(params.event as MouseEvent, {
						options: [
							{
								name: 'Remove from Role',
								action: async () => {
									if (params.data) {
										const res = await Permissions.removeFromRole(role, params.data.account);
										if (res.isErr()) {
											console.error('Failed to remove member from role:', res.error);
											return;
										}

										if (!res.value.success) {
											console.error('Failed to remove member from role:', res.value.message);
											return alert(
												'Error: ' + res.value.message || 'Failed to remove member from role'
											);
										}
									}
								},
								icon: {
									type: 'material-icons',
									name: 'remove_circle'
								}
							}
						],
						width: '200px'
					});
				}
			}}
		/>
	</div>
	<div class="row mb-3">
		<div class="col">
			<button
				type="button"
				class="btn btn-primary"
				onclick={async () => {
					const account = await Account.searchAccountsModal({
						filter: (account) => !$members.find((m) => m.account.data.id === account.data.id)
					});
					if (!account) return;
					const res = await Permissions.addToRole(role, account);
					if (res.isErr()) {
						console.error('Failed to add member to role:', res.error);
						return;
					}

					if (!res.value.success) {
						console.error('Failed to add member to role:', res.value.message);
						return alert('Error: ' + res.value.message || 'Failed to add member to role');
					}
				}}
			>
				<i class="material-icons">add</i>
				Add Member
			</button>
		</div>
	</div>
</div>
