<script lang="ts">
	import { Permissions } from '$lib/model/permissions';

	const id = Math.random().toString(36).substring(2, 15);

	interface Props {
		onselect: (role: Permissions.RoleData) => void;
	}

	const { onselect }: Props = $props();

	let roles: Permissions.RoleData[] = $state([]);
	$inspect(roles);

	let searchKey = $state('');

	let offset = $state(0);
	let limit = $state(10);

	let searchTimeout: ReturnType<typeof setTimeout>;

	const search = () => {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(async () => {
			roles = [];

			const res = await Permissions.searchRoles(searchKey, {
				offset,
				limit
			});

			if (res.isOk()) {
				roles = res.value;
			} else {
				console.error(res.error);
			}
		}, 300);
	};
</script>

<div>
	<div class="form-floating mb-3">
		<input
			type="text"
			class="form-control"
			id="role-search-{id}"
			placeholder="ex: Viewer"
			oninput={search}
		/>
		<label for="role-search-{id}">Search Roles</label>
	</div>
	<ul class="list-group">
		{#each roles as role}
			<li class="list-group-item p-0">
				<button type="button" class="btn btn-dark w-100 h-100" onclick={() => onselect(role)}>
					{role.data.name}
				</button>
			</li>
		{/each}
	</ul>
</div>
