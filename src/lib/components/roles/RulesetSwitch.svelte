<script lang="ts">
	import { Permissions } from '$lib/model/permissions';
	import { onMount } from 'svelte';

	interface Props {
		role: Permissions.RoleData;
		ruleset: Permissions.RoleRulesetData;
	}

	const { role, ruleset }: Props = $props();

	let roleRulesets = $state(Permissions.RoleRuleset.arr());

	onMount(() => {
		roleRulesets = Permissions.RoleRuleset.fromProperty('role', String(role.data.id), false);
	});
</script>

<div class="form-check form-switch">
	<input class="form-check-input" type="checkbox" role="switch" id="switchCheckDefault" />
	<label class="form-check-label" for="switchCheckDefault">Default switch checkbox input</label>
</div>
