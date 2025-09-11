import { Permissions } from '../src/lib/server/structs/permissions';
import { DB } from '../src/lib/server/db';
import { resolveAll } from 'ts-utils/check';
import { selectAccount } from '../cli/accounts';
import { Account } from '../src/lib/server/structs/account';
import { Test } from '../src/lib/server/structs/testing';

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
			Permissions.Entitlement.build(DB),
			Test.TestPermissions.build(DB),
			Test.Test.build(DB)
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
			},
			{
				name: 'View Test Data',
				description: 'Can view test data',
				entitlement: 'test-permission-view',
				targetAttribute: 'test-role',
				featureScopes: ['test-scope']
			},
			{
				name: 'Manage Test Data',
				description: 'Can manage test data',
				entitlement: 'test-permission-manage',
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

	await Test.TestPermissions.clear().unwrap();

	// create 10 test entries
	await Promise.all(
		Array.from({ length: 10 }).map(async (_, i) => {
			const data = await Test.TestPermissions.new({
				name: `Test Entry ${i + 1}`,
				age: Math.floor(Math.random() * 100)
			}).unwrap();

			data.setAttributes(['test-role']);
		})
	);
};
