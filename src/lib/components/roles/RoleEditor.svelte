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
		};
	}>({});

	onMount(() => {
		let staging: Permissions.RoleRulesetData[] | undefined = [];
		let entitlementsDone = false;
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

		const availableUnsub = availablePermissions.subscribe((p) => {
			if (!entitlementsDone) {
				// Groups are not created yet, so we can only collect rulesets
				return (staging = p);
			}

			// Groups are created so we can assign rulesets to groups
			assign(p);
		});
		const entitlementUnsub = entitlements.subscribe((e) => {
			if (entitlementsDone) return;
			entitlementsDone = true;

			for (const entitlement of e) {
				if (!groups[String(entitlement.data.name)]) {
					groups[String(entitlement.data.name)] = {
						ruleset: undefined,
						entitlement: entitlement,
						switch: undefined
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
			availableUnsub();
			entitlementUnsub();
		};
	});

	export const save = () => {
		for (const group of Object.keys(groups)) {
			groups[group].switch?.save();
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
						<RulesetSwitch
							bind:this={groups[group].switch}
							{role}
							ruleset={groups[group].ruleset}
							{saveOnChange}
						/>
					{/if}
				{/each}
			</ul>
		</div>
	{/each}
</div>
