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

	$inspect(groups);

	onMount(() => {
		availablePermissions = Permissions.getAvailableRolePermissions(role);
		entitlements = Permissions.getEntitlements();

		const assign = () => {
			console.log('Assigning rulesets to groups', availablePermissions.data, entitlements.data);
			for (const entitlement of entitlements.data) {
				if (!groups[String(entitlement.data.group)]) {
					groups[String(entitlement.data.group)] = {
						ruleset: undefined,
						entitlement,
						switch: undefined
					};
				}

				const matched = availablePermissions.data.find((r) => r.data.entitlement === entitlement.data.name);
				if (matched) {
					groups[String(entitlement.data.group)].ruleset = matched;
				}
			}
			// remove from memory because we don't need it anymore.
			groups = { ...groups };
		};

		const availableUnsub = availablePermissions.subscribe((p) => {
			assign();
		});
		const entitlementUnsub = entitlements.subscribe((e) => {
			assign();
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
	{#each Object.entries(groups) as [name, group]}
		<hr>
		<div class="row mb-3">
			<h4>{name}</h4>
		</div>
		<div class="row mb-3">
			<div class="col-12">
				<ul class="list-group">
					{#if group.ruleset}
						<RulesetSwitch
							bind:this={group.switch}
							{role}
							ruleset={group.ruleset}
							{saveOnChange}
						/>
					{/if}
				</ul>
			</div>
		</div>
	{/each}
	{#if $role.parent === ''}
		<div class="alert alert-info">
			This role is a local admin role, it defines the permissions for its system. You cannot modify its permissions.
		</div>
	{/if}
</div>
