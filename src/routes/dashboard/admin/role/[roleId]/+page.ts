/**
 * @fileoverview Client load for admin role detail `/dashboard/admin/role/[roleId]`.
 */
import { Permissions } from '$lib/model/permissions.js';
import { Account } from '$lib/model/account.js';
import { writable } from 'svelte/store';

export const load = (event) => {
	return {
		role: Permissions.Role.Generator(event.data.role),
		parent: event.data.parent ? Permissions.Role.Generator(event.data.parent) : undefined,
		children: Permissions.Role.arr(
			event.data.children.map((c) => Permissions.Role.Generator(c)),
			(d) => !!d.data.parent && !!event.data.role.id && d.data.parent === event.data.role.id
		),
		avaliableRulesets: Permissions.RoleRuleset.arr(
			event.data.availableRulesets.map((r) => Permissions.RoleRuleset.Generator(r))
		),
		rulesets: Permissions.RoleRuleset.arr(
			event.data.currentRulesets.map((r) => Permissions.RoleRuleset.Generator(r)),
			(d) => !!d.data.role && !!event.data.role.id && d.data.role === event.data.role.id
		),
		// TODO: Add reactivity
		members: writable(
			event.data.members.map((m) => ({
				account: Account.Account.Generator(m.account),
				roleAccount: Permissions.RoleAccount.Generator(m.roleAccount)
			}))
		)
	};
};
