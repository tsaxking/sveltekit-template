<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { alert } from '$lib/utils/prompts';

	interface Props {
		parent: Permissions.RoleData;
		oncreate?: (role: Permissions.RoleData) => void;
	}

	const { parent, oncreate }: Props = $props();

	let name = $state('');
	let description = $state('');

	export const save = async () => {
		if (!name) return alert('Role name is required');

		const res = await Permissions.createRole(parent, {
			name,
			description,
			color: '#000000'
		});

		if (res.isErr()) {
			console.error(res.error);
			return alert(`Error creating role.`);
		}

		if (!res.value.success) {
			console.error(res.value.message);
			return alert(`Error creating role: ${res.value.message}`);
		}

		if (!oncreate) return;
		const role = Permissions.Role.getZodSchema({
			optionals: Object.keys(Permissions.Role.data.structure)
		}).safeParse(res.value);

		if (role.success) {
			oncreate(Permissions.Role.Generator(role.data));
		} else {
			console.error(role.error);
		}
	};
</script>

<div class="container-fluid">
	<div class="row mb-3">
		<label for="role-name" class="form-label">Role Name</label>
		<input
			type="text"
			class="form-control"
			id="role-name"
			bind:value={name}
			placeholder="Enter role name"
		/>
	</div>
	<div class="row mb-3">
		<label for="role-description" class="form-label">Role Description</label>
		<textarea
			class="form-control"
			id="role-description"
			bind:value={description}
			placeholder="Enter role description"
		></textarea>
	</div>
	<div class="row mb-3">
		<button class="btn btn-primary" onclick={save}>Create Role</button>
	</div>
</div>
