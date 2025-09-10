<script lang="ts">
	import RoleSelect from '$lib/components/roles/RoleSelect.svelte';
	import nav from '$lib/imports/admin.js';
	import Grid from '$lib/components/general/Grid.svelte';
	import RoleEditor from '$lib/components/roles/RoleRulesetEditor.svelte';
	import { Permissions } from '$lib/model/permissions';

	nav();

	const { data } = $props();
	const role = $derived(data.role);
	const parent = $derived(data.parent);
	const children = $derived(data.children);
	const members = $derived(data.members);
</script>

<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h1>Role: {$role.name}</h1>
			<p class="text-muted">
				View and manage the details of this role.
			</p>
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
	{#if $role.parent !== ''}
		<div class="row mb-3">
			<div class="col">
				<button type="button" class="btn btn-primary" onclick={() => {
					window.location.href = `/dashboard/admin/role/${$role.parent}`;
				}}>
					<i class="material-icons">
						person
					</i>
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
			<p class="text-muted">
				View and manage the child roles of this role.
			</p>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col">
			<Grid 
				data={children}
				height="400px"
				opts={{
					columnDefs: [{
						headerName: 'Name',
						field: 'data.name',
					}, {
						headerName: 'Description',
						field: 'data.description',
					}],
					onRowDoubleClicked: (params) => {
						window.location.href = `/dashboard/admin/role/${params.data?.data.id}`;
					}
				}}
			/>
		</div>
	</div>
	<div class="row mb-3">
		<div class="col-6">
			<button type="button" class="btn btn-primary" onclick={async () => {
				const res = await Permissions.createChildRolePopup(role);
				if (res.isErr()) {
					console.error('Failed to create child role:', res.error);
					return;
				}
				const data = res.value;
			}}>
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
		<RoleEditor 
			{role}
			saveOnChange={true}
		/>
	</div>
</div>


<div class="container layer-1 mb-5 pb-3">
	<div class="row mb-3">
		<div class="col">
			<h2>Members</h2>
			<p class="text-muted">
				View and manage the members assigned to this role.
			</p>
		</div>
	</div>
	<div class="row mb-3">
		<Grid 
			data={members}
			height="400px"
			opts={{
				columnDefs: [{
					headerName: 'Username',
					field: 'data.username',
				}, {
					headerName: 'Email',
					field: 'data.email',
				}, {
					headerName: 'First Name',
					field: 'data.firstName',
				}, {
					headerName: 'Last Name',
					field: 'data.lastName',
				}]
			}}
		/>
	</div>
</div>