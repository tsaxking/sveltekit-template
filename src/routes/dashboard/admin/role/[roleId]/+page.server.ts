import { redirect, fail } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { Account } from '$lib/server/structs/account';
import { Permissions } from '$lib/server/structs/permissions.js';

export const load = async (event) => {
	if (!event.locals.account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}

	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});
	}

	const role = await Permissions.Role.fromId(event.params.roleId).unwrap();
	if (!role) {
		throw fail(ServerCode.notFound, {
			message: 'Role not found'
		});
	}

	const currentRulesets = await Permissions.getRulesetsFromRole(role).unwrap();

	const parent = await Permissions.Role.fromId(role.data.parent).unwrap();
	let availableRulesets: Permissions.RoleRulesetData[] = [];
	if (parent) {
		availableRulesets = await Permissions.getRulesetsFromRole(parent).unwrap();
	}

	const children = await Permissions.getChildren(role).unwrap();

	return {
		role: role.safe(),
		parent: parent?.safe(),
		children: children.map((c) => c.safe()),
		currentRulesets: currentRulesets.map((r) => r.safe()),
		availableRulesets: availableRulesets.map((r) => r.safe())
	};
};
