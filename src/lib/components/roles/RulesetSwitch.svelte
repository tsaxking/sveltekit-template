<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const id = Math.random().toString(36).substring(2, 15);

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
	let disabled = $state(false);

	export const hasUnsaved = writable(false);

	// $effect(() => {
	// 	hasUnsaved.set(unsaved);
	// });

	export const save = async () => {
		if (isOn) {
			if (ruleset) return; // already granted
			const res = await Permissions.grantRuleset(role, parentRuleset);
			if (res.isErr()) {
				console.error('Failed to grant ruleset:', res.error);
			}
		} else {
			if (!ruleset) return; // already revoked
			const res = await Permissions.revokeRolePermission(ruleset);
			if (res.isErr()) {
				console.error('Failed to revoke ruleset:', res.error);
			} else {
				ruleset = undefined;
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

		if (role.data.parent === '') {
			isOn = true;
			disabled = true;
			return;
		}

		roleRulesets = Permissions.RoleRuleset.fromProperty('role', String(role.data.id), {
			type: 'all'
		});

		return roleRulesets.subscribe((v) => {
			const rs = v.find((r) => r.data.parent === parentRuleset.data.id);
			ruleset = rs;
			isOn = !!rs;
		});
	});
</script>

<div class="form-check form-switch">
	<input
		{disabled}
		class="form-check-input"
		type="checkbox"
		role="switch"
		id="switch-{id}"
		bind:checked={isOn}
		onchange={() => {
			unsaved = true;
			if (saveOnChange) save();
		}}
	/>
	<label class="form-check-label" for="switch-{id}">
		{$parentRuleset.name}
		{#if $parentRuleset.description}
			- <small class="text-muted">{$parentRuleset.description}</small>
		{/if}
	</label>
	{#if unsaved}
		<span class="badge bg-warning text-dark ms-2">Unsaved</span>
	{/if}
</div>
