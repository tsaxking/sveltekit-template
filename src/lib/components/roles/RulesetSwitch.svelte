<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	interface Props {
		role: Permissions.RoleData;
		ruleset: Permissions.RoleRulesetData;
		saveOnChange: boolean;
	}

	const { role, ruleset: parentRuleset, saveOnChange }: Props = $props();

	let roleRulesets = $state(Permissions.RoleRuleset.arr());
	let ruleset: Permissions.RoleRulesetData | undefined = $state(undefined);

	let isOn = $state(false);
	let unsaved = $state(false);

	export const hasUnsaved = writable(false);

	$effect(() => {
		hasUnsaved.set(unsaved);
	});

	export const save = async () => {
		if (isOn) {
			if (ruleset) return; // already granted
			const res = await Permissions.grantRuleset(role, parentRuleset);
			if (res.isErr()) {
				console.error('Failed to grant ruleset:', res.error);
				return;
			}
		} else {
			if (!ruleset) return; // already revoked
			const res = await Permissions.revokeRolePermission(ruleset);
			if (res.isErr()) {
				console.error('Failed to revoke ruleset:', res.error);
				return;
			}
		}
		unsaved = false;
	};

	export const set = (value: boolean) => {
		isOn = value;
	};

	onMount(() => {
		if (parentRuleset.data.role && role.data.id && parentRuleset.data.role === role.data.id) {
			console.warn(
				"Ruleset is assigned to this role. You can only pass in rulesets that are owned by the role's parent."
			);
		}

		roleRulesets = Permissions.RoleRuleset.fromProperty('role', String(role.data.id), false);

		return roleRulesets.subscribe((v) => {
			isOn = v.some((r) => r.data.parent === parentRuleset.data.id);
		});
	});
</script>

<div class="form-check form-switch">
	<input
		class="form-check-input"
		type="checkbox"
		role="switch"
		id="switchCheckDefault"
		bind:checked={isOn}
		onchange={() => {
			unsaved = true;
			if (saveOnChange) save();
		}}
	/>
	<label class="form-check-label" for="switchCheckDefault">
		{$parentRuleset.name}
		{#if $parentRuleset.description}
			- <small class="text-muted">{$parentRuleset.description}</small>
		{/if}
	</label>
</div>
