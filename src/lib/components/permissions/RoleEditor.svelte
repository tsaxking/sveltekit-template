<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { DataArr } from 'drizzle-struct/front-end';
	import { onMount } from 'svelte';
	import { capitalize, fromSnakeCase } from 'ts-utils/text';

	interface Props {
		role: Permissions.RoleData;
	}

	const { role }: Props = $props();

	let currentPermissions = $state(new DataArr(Permissions.RoleRuleset, []));
	let availablePermissions = $state(new DataArr(Permissions.RoleRuleset, []));
	let entitlements = $state(new DataArr(Permissions.Entitlement, []));
	let groups = $state<{
		[key: string]: {
			ruleset: Permissions.RoleRulesetData | undefined;
			entitlement: Permissions.EntitlementData;
		};
	}>({});

	onMount(() => {
		let staging: Permissions.RoleRulesetData[] | undefined = [];
		let entitlementsDone = false;
		currentPermissions = Permissions.getRolePermissions(role);
		availablePermissions = Permissions.getAvailableRolePermissions(role);
		entitlements = Permissions.getEntitlements();

		const assign = (rulesets: Permissions.RoleRulesetData[]) => {
			for (const rs of rulesets) {
				const entitlement = entitlements.data.find((e) => e.data.name === rs.data.entitlement);
				if (entitlement) {
					// Check if the group already exists, if not create it
				} else {
					console.error(`Entitlement ${rs.data.entitlement} not found`);
				}
			}
			// remove from memory because we don't need it anymore.
			staging = undefined;
		};

		const apUnsub = availablePermissions.subscribe((p) => {
			if (!entitlementsDone) {
				// Groups are not created yet, so we can only collect rulesets
				return (staging = p);
			}

			// Groups are created so we can assign rulesets to groups
			assign(p);
		});
		const etUnsub = entitlements.subscribe((e) => {
			if (entitlementsDone) return;
			entitlementsDone = true;

			for (const entitlement of e) {
				if (!groups[String(entitlement.data.name)]) {
					groups[String(entitlement.data.name)] = {
						ruleset: undefined,
						entitlement: entitlement
					};
				} else {
					console.warn(`Entitlement ${entitlement.data.name} already exists in groups, skipping.`);
				}
			}
			groups = { ...groups };

			// If this isn't entered, it will be entered when the available permissions are updated.
			if (staging) {
				assign(staging);
			}
		});

		return () => {
			apUnsub();
			etUnsub();
		};
	});

	const grant = async (ruleset: Permissions.RoleRulesetData) => {
		const entitlement = $entitlements.find((e) => e.data.name === ruleset.data.entitlement);
		if (entitlement) {
			const res = await Permissions.grantRolePermission(
				role,
				entitlement,
				String(ruleset.data.target)
			);
			return res.isOk();
		} else {
			console.error(`Entitlement ${ruleset.data.entitlement} not found`);
		}
	};

	const revoke = async (ruleset: Permissions.RoleRulesetData) => {
		const entitlement = $entitlements.find((e) => e.data.name === ruleset.data.entitlement);
		if (entitlement) {
			const res = await Permissions.revokeRolePermission(
				role,
				entitlement,
				String(ruleset.data.target)
			);
			return res.isOk();
		} else {
			console.error(`Entitlement ${ruleset.data.entitlement} not found`);
		}
	};
</script>

<div class="container">
	{#each Object.keys(groups) as group}
		<div class="row mb-3">
			<h3>{group}</h3>
		</div>
		<div class="row mb-3">
			<ul class="list-group">
				{#each Object.keys(groups) as group}
					{#if groups[group].ruleset}
						<li class="list-group-item">
							<div class="form-check form-switch">
								<input
									class="form-check-input"
									type="checkbox"
									role="switch"
									id="switch-check-{groups[group].entitlement.data.name}"
								/>
								<label
									class="form-check-label"
									for="switch-check-{groups[group].entitlement.data.name}"
									>{capitalize(
										fromSnakeCase(String(groups[group].entitlement.data.name), '-')
									)}</label
								>
							</div>
							<small class="text-muted">
								{groups[group].entitlement.data.description || 'No description available.'}
							</small>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/each}
</div>
