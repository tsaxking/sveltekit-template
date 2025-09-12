import * as testing from '@playwright/test';
import { Account } from '../src/lib/server/structs/account';
import { Permissions } from '../src/lib/server/structs/permissions';
import { Test } from '../src/lib/server/structs/testing';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '../src/lib/server/db';
import { logging, signIn } from './test-utils';
import { v4 as uuid } from 'uuid';
import { sleep } from 'ts-utils/sleep';
import { str } from '../src/lib/server/utils/env';

const expect = testing.expect;
const test = testing.test;
const describe = testing.default.describe;
const afterAll = testing.default.afterAll;
const beforeAll = testing.default.beforeAll;

let hierarchy: {
	role: Permissions.RoleData;
	rulesets: Permissions.RoleRulesetData[];
};

let account: Account.AccountData | undefined;

const id = uuid();

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	const signIn = str('AUTO_SIGN_IN', false);
	if (signIn) {
		throw new Error('AUTO_SIGN_IN is set. Please unset it for e2e tests.');
	}

	account = await Account.createAccount({
		username: 'testuserpermissions',
		email: 'testuser.permissions@example.com',
		firstName: 'Test',
		lastName: 'User',
		password: 'Password123!'
	}).unwrap();

	hierarchy = await Permissions.startHierarchy(
		'test-permission-e2e',
		'A test permission for e2e tests',
		[
			{
				entitlement: 'test-permission-view',
				targetAttribute: id,
				featureScopes: [id],
				name: 'View Test Entries',
				description: 'Can view test entries'
			}
		]
	).unwrap();

	await Permissions.grantRole(hierarchy.role, account).unwrap();

	await Promise.all(
		Array.from({ length: 5 }).map(async () => {
			const res = await Test.TestPermissions.new({
				name: `Test User ${id}`,
				age: Math.floor(Math.random() * 100)
			}).unwrap();

			await res.setAttributes([id]).unwrap();
		})
	);
});

afterAll(async () => {
	if (account) {
		await account.delete().unwrap();
	}

	if (hierarchy) {
		await hierarchy.role.delete().unwrap();
		await Promise.all(hierarchy.rulesets.map((rs) => rs.delete().unwrap()));
	}
	const tests = await Test.TestPermissions.fromProperty('name', `Test User ${id}`, {
		type: 'all'
	}).unwrap();

	await Promise.all(tests.map((t) => t.delete().unwrap()));
});

describe('Log in as user with specific permissions', () => {
	test('Permissions', async ({ page }) => {
		logging(page);
		if (!hierarchy) {
			throw new Error('Hierarchy not set');
		}

		if (!account) {
			throw new Error('Account not set');
		}

		await signIn(page, 'testuserpermissions', 'Password123!');

		await page.goto('/test/permissions');

		const permissions = await Permissions.getRulesetsFromAccount(account).unwrap();

		expect(permissions.length).toBe(2);

		const foundItems = await Test.TestPermissions.fromProperty('name', `Test User ${id}`, {
			type: 'all'
		}).unwrap();

		expect(foundItems.length).toBe(5);

		await sleep(5000);

		const items = await page.locator('li').all();

		expect(items.length).toBe(5);
	});
});
