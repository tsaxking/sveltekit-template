import { Permissions } from '$lib/model/permissions.js';

export const load = (event) => {
	return {
		role: Permissions.Role.Generator(event.data.role),
		parent: event.data.parent ? Permissions.Role.Generator(event.data.parent) : undefined,
		children: Permissions.Role.arr(event.data.children.map((c) => Permissions.Role.Generator(c))),
		avaliableRulesets: Permissions.RoleRuleset.arr(
			event.data.availableRulesets.map((r) => Permissions.RoleRuleset.Generator(r))
		),
		rulesets: Permissions.RoleRuleset.arr(
			event.data.currentRulesets.map((r) => Permissions.RoleRuleset.Generator(r))
		)
	};
};
