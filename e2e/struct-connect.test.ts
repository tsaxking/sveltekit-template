import * as testing from '@playwright/test';
import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db';
import { Account } from '../src/lib/server/structs/account';
import { logging, signIn } from './test-utils';

const expect = testing.expect;
const test = testing.test;
const beforeAll = testing.default.beforeAll;
const afterAll = testing.default.afterAll;

let account: Account.AccountData | undefined;

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	process.env.AUTO_SIGN_IN = undefined; // disable auto sign in for this test

	account = await Account.createAccount({
		username: 'testuserstructregistry',
		email: 'test.user.struct-registry@example.com',
		firstName: 'Test',
		lastName: 'User',
		password: 'Password123!'
	}).unwrap();
});

afterAll(async () => {
	if (account) {
		await account.delete().unwrap();
	}
});

test('Struct connections and registry blocking', async ({ page }) => {
	logging(page);
	if (!account) {
		throw new Error('Test account not created');
	}

	await signIn(page, 'testuserstructregistry', 'Password123!');
	await page.goto('/test/struct');

	const status = await page.locator('#status').elementHandle();
	if (!status) {
		throw new Error('No test list found');
	}

	await status.waitForElementState('visible');

	const pass = await status.getAttribute('data-pass');
	expect(pass).toBe('true');

	await expect
		.poll(async () => {
			return page.getByTestId('struct-registry-blocked').getAttribute('data-status');
		})
		.toBe('blocked');
});
