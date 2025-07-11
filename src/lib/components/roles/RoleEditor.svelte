<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { onMount } from 'svelte';

	interface Props {
		role: Permissions.RoleData;
	}

	const { role }: Props = $props();

	let permissions = $state(Permissions.RoleRuleset.arr());
	let available = $state(Permissions.RoleRuleset.arr());
	let entitlements = $state(Permissions.Entitlement.arr());
	let groups = $state<string[]>([]);

	let toAdd = $state<Permissions.RoleRulesetData[]>([]);
	let toRemove = $state<Permissions.RoleRulesetData[]>([]);

	const save = () => {};

	onMount(() => {
		permissions = Permissions.getRolePermissions(role);
		available = Permissions.getAvailableRolePermissions(role);
		entitlements = Permissions.getEntitlements();
		Permissions.getEntitlementGroups().then((groupList) => {
			if (groupList.isOk()) {
				groups = groupList.value;
			}
		});
	});
</script>

<div class="container-fluid">
	<div class="row mb-3">
		<div class="col-12">
			<h2>Edit Role: {$role.name}</h2>
		</div>
	</div>
	{#each groups as group}
		<div class="row mb-3">
			<div class="col-12">
				<h3>{group}</h3>
			</div>
		</div>
		{#each $entitlements.filter((e) => e.data.group === group) as entitlement}
			{#each $available.filter((p) => p.data.entitlement === entitlement.data.name) as permission}
				<div class="row mb-3">
					<div class="col-12">
						<div class="form-check form-switch">
							<input
								class="form-check-input"
								type="checkbox"
								role="switch"
								id="switch-{permission.data.id}"
								onchange={(e) => {
									if (e.currentTarget.checked) {
										if (!toAdd.includes(permission)) {
											toAdd.push(permission);
										}
										toRemove = toRemove.filter((p) => p !== permission);
									} else {
										if (!toRemove.includes(permission)) {
											toRemove.push(permission);
										}
										toAdd = toAdd.filter((p) => p !== permission);
									}
								}}
							/>
							<label class="form-check-label" for="switch-{permission.data.id}"
								>{permission.data.reason}</label
							>
						</div>
					</div>
				</div>
			{/each}
		{/each}
	{/each}
</div>
