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
			Account.Account.build(DB)
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

	const roleData = await Permissions.Role.new({
		name: roleName,
		description: `Test role for ${account.data.username}`,
		parent: 'default',
		lifetime: 1000 * 60 * 60 * 24 // 1 day
	}).unwrap();

	await Permissions.RoleAccount.new({
		role: roleData.id,
		account: account.data.id
	}).unwrap();

	console.log(`Role "${roleName}" created for account "${account.data.username}".`);

	await Permissions.grantRoleRuleset(
		roleData,
		'manage-roles',
		'test',
		'Test role ruleset for ' + roleName
	).unwrap();

	await Permissions.grantRoleRuleset(
		roleData,
		'view-roles',
		'test',
		'Test role ruleset for ' + roleName
	).unwrap();
};
