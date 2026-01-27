import * as testing from '@playwright/test';
import { Account } from '../src/lib/server/structs/account';
import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db';
import { signIn, logging } from './test-utils';

const expect = testing.expect;
const test = testing.test;
const describe = testing.default.describe;
const afterAll = testing.default.afterAll;
const beforeAll = testing.default.beforeAll;
beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	process.env.AUTO_SIGN_IN = undefined; // disable auto sign in for this test
});

afterAll(async () => {
	const accountA = await Account.Account.get(
		{ username: 'testuser' },
		{
			type: 'single'
		}
	).unwrap();
	if (accountA) {
		await accountA.delete().unwrap();
	}

	const accountB = await Account.Account.get(
		{ username: 'testuser2' },
		{
			type: 'single'
		}
	).unwrap();

	if (accountB) {
		await accountB.delete().unwrap();
	}
});

describe('Account Sign Up', () => {
	test('Accounts', async ({ page }) => {
		logging(page);
		{
			await page.goto('/account/sign-up');

			const username = await page.locator('#username').elementHandle();
			const email = await page.locator('#email').elementHandle();
			const firstName = await page.locator('#firstName').elementHandle();
			const lastName = await page.locator('#lastName').elementHandle();
			const password = await page.locator('#password').elementHandle();
			const confirmPassword = await page.locator('#confirmPassword').elementHandle();
			const signUpButton = await page.locator('#signUpButton').elementHandle();
			const formMessage = await page.locator('#formMessage').elementHandle();

			if (
				!username ||
				!email ||
				!firstName ||
				!lastName ||
				!password ||
				!confirmPassword ||
				!signUpButton ||
				!formMessage
			) {
				throw new Error('One or more form elements not found');
			}

			await username.fill('testuser');
			await email.fill('testuser@example.com');
			await firstName.fill('Test');
			await lastName.fill('User');
			await password.fill('TestPassword123!');
			await confirmPassword.fill('TestPassword123!');

			await signUpButton.click();

			// wait for any navigation and find the url
			await page.waitForNavigation();
			expect(page.url()).toBe('http://localhost:4173/account/sign-up?/register');
		}

		const account = await Account.Account.get(
			{ username: 'testuser' },
			{
				type: 'single'
			}
		).unwrap();
		if (!account) {
			throw new Error('Account not found');
		}

		expect(account.data.username).toBe('testuser');
		expect(account.data.email).toBe('testuser@example.com');
		expect(account.data.firstName).toBe('Test');
		expect(account.data.lastName).toBe('User');
		expect(account.data.verified).toBe(false);
		{
			await signIn(page, 'testuser', 'TestPassword123!');

			await page.goto('/test/account');
			const accountInfo = await page.locator('#accountInfo').elementHandle();
			if (!accountInfo) {
				throw new Error('Account info not found');
			}

			const success = await accountInfo.getAttribute('data-success');
			expect(success).toBe('true');
		}
	});
});

describe('Account Request Password Reset', () => {
	test('Request Password Reset', async ({ page }) => {
		logging(page);
		const _account = await Account.createAccount({
			username: 'testuser2',
			email: 'testuser2@example.com',
			firstName: 'Test2',
			lastName: 'User2',
			password: 'TestPassword123!'
		}).unwrap();

		// TODO: Implement password reset test when email sending is set up
		expect(true).toBe(true);
	});
});
