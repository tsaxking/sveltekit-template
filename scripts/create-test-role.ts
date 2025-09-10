import { Permissions } from '../src/lib/server/structs/permissions';
import { DB } from '../src/lib/server/db';
import { resolveAll } from 'ts-utils/check';
import { selectAccount } from '../cli/accounts';
import { Account } from '../src/lib/server/structs/account';

export default async (roleName: string) => {
	if (!roleName) {
		throw new Error('Role name is required');
	}
	resolveAll(
		await Promise.all([
			Permissions.Role.build(DB),
			Permissions.RoleRuleset.build(DB),
			Permissions.RoleAccount.build(DB),
			Account.Account.build(DB),
			Permissions.Entitlement.build(DB)
		])
	).unwrap();

	roleName = `TEST-` + roleName.trim();

	const role = await Permissions.Role.fromProperty('name', roleName, { type: 'single' }).unwrap();
	if (role) {
		console.log(`Role "${roleName}" already exists.`);
		return;
	}

	const account = await selectAccount().unwrap();
	if (!account) throw new Error('No account selected');

	const roleData = await Permissions.startHierarchy(
		`Test Role: ${roleName}`,
		`Description: ${roleName}`,
		[
			{
				name: 'Test Ruleset',
				description: 'Test Ruleset Description',
				entitlement: 'view-roles',
				targetAttribute: 'test-role',
				featureScopes: ['test-scope']
			}
		]
	).unwrap();

	await Permissions.RoleAccount.new({
		role: roleData.role.id,
		account: account.data.id
	}).unwrap();

	console.log(`Role "${roleName}" created for account "${account.data.username}".`);
};
