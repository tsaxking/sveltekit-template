<!--
@component
Role ruleset editor grouped by entitlement.

**Props**
- `role`: `Permissions.RoleData` — Role being edited.
- `saveOnChange`: `boolean` — Save immediately on changes.

**Exports**
- `save()`: persist all rule changes.

**Example**
```svelte
<RoleRulesetEditor {role} saveOnChange={false} />
```
-->
<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { onMount } from 'svelte';
	import RulesetSwitch from './RulesetSwitch.svelte';

	interface Props {
		role: Permissions.RoleData;
		saveOnChange: boolean;
	}

	const { role, saveOnChange }: Props = $props();

	let availablePermissions = $state(Permissions.RoleRuleset.arr());
	let entitlements = $state(Permissions.Entitlement.arr());
	let groups = $state<{
		[key: string]: {
			ruleset: Permissions.RoleRulesetData | undefined;
			entitlement: Permissions.EntitlementData;
			switch: RulesetSwitch | undefined;
		}[];
	}>({});

	onMount(() => {
		const res = Permissions.getAvailableRolePermissions(role);
		if (res.isOk()) {
			availablePermissions = res.value;
		} else {
			console.error('Failed to load available permissions:', res.error);
		}
		entitlements = Permissions.getEntitlements();

		const assign = () => {
			for (const entitlement of entitlements.data) {
				if (!groups[String(entitlement.data.group)]) {
					groups[String(entitlement.data.group)] = [
						{
							ruleset: undefined,
							entitlement: entitlement,
							switch: undefined
						}
					];
				}

				const matched = availablePermissions.data.find(
					(r) => r.data.entitlement === entitlement.data.name
				);
				if (matched) {
					const group = groups[String(entitlement.data.group)];
					if (group) {
						const item = group.find((g) => g.entitlement.data.name === entitlement.data.name);
						if (item) {
							item.ruleset = matched;
						} else {
							group.push({
								ruleset: matched,
								entitlement: entitlement,
								switch: undefined
							});
						}
					}
				}
			}
			// remove from memory because we don't need it anymore.
			groups = { ...groups };
		};

		const availableUnsub = availablePermissions.subscribe(() => {
			assign();
		});
		const entitlementUnsub = entitlements.subscribe(() => {
			assign();
		});

		return () => {
			availableUnsub();
			entitlementUnsub();
		};
	});

	export const save = () => {
		for (const group of Object.keys(groups)) {
			for (const item of groups[group]) {
				item.switch?.save();
			}
		}
	};
</script>

<div class="container">
	{#each Object.entries(groups).filter(([, g]) => g.filter((i) => i.ruleset).length) as [name, group]}
		<hr />
		<div class="row mb-3">
			<h4>{name}</h4>
		</div>
		<div class="row mb-3">
			<div class="col-12">
				<ul class="list-group">
					{#each group as item}
						{#if item.ruleset}
							<li class="list-group-item">
								<RulesetSwitch
									bind:this={item.switch}
									ruleset={item.ruleset}
									{role}
									{saveOnChange}
								/>
							</li>
						{/if}
					{/each}
				</ul>
			</div>
		</div>
	{/each}
	{#if $role.parent === ''}
		<div class="alert alert-info">
			This role is a local admin role, it defines the permissions for its system. You cannot modify
			its permissions.
		</div>
	{/if}
</div>
