import * as testing from '@playwright/test';
import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db';
import { Account } from '../src/lib/server/structs/account';
import { logging, signIn } from './test-utils';

const expect = testing.expect;
const test = testing.test;
const describe = testing.default.describe;
const beforeAll = testing.default.beforeAll;
const afterAll = testing.default.afterAll;

let adminAccount: Account.AccountData | undefined;

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
	process.env.AUTO_SIGN_IN = undefined; // disable auto sign in for this test

	adminAccount = await Account.createAccount({
		username: 'testadminsessionmanager',
		email: 'test.admin.session-manager@example.com',
		firstName: 'Test',
		lastName: 'Admin',
		password: 'Password123!'
	}).unwrap();

	await adminAccount
		.update({
			verified: true,
			verification: ''
		})
		.unwrap();

	await Account.Admins.new({
		accountId: adminAccount.id
	}).unwrap();
});

afterAll(async () => {
	if (adminAccount) {
		const adminMembership = await Account.Admins.get(
			{ accountId: adminAccount.id },
			{ type: 'single' }
		).unwrap();

		if (adminMembership) {
			await adminMembership.delete().unwrap();
		}

		await adminAccount.delete().unwrap();
	}
});

describe('Session manager', () => {
	test('Sends a test event to another page connection', async ({ page, browser }) => {
		logging(page);
		if (!adminAccount) {
			throw new Error('Admin account not created');
		}

		await signIn(page, 'testadminsessionmanager', 'Password123!');
		await page.goto('/test/session-manager');

		await expect
			.poll(
				async () => {
					return page.getByTestId('sse-state').getAttribute('data-connected');
				},
				{ timeout: 20000 }
			)
			.toBe('true');

		await expect
			.poll(
				async () => {
					return page.getByTestId('manager-state').getAttribute('data-state');
				},
				{ timeout: 20000 }
			)
			.toBe('Connected');

		const clientContext = await browser.newContext();
		const clientPage = await clientContext.newPage();
		logging(clientPage);

		try {
			await clientPage.goto('/test/session-manager/client');

			await expect
				.poll(
					async () => {
						return clientPage.getByTestId('client-connection').getAttribute('data-connected');
					},
					{ timeout: 20000 }
				)
				.toBe('true');

			const clientRow = page.locator(
				'[data-testid="connection-row"][data-connection-url*="/test/session-manager/client"]'
			);

			await page.getByTestId('refresh-connections').click();
			await expect.poll(async () => clientRow.count(), { timeout: 20000 }).toBeGreaterThan(0);

			await clientRow.first().locator('[data-testid="send-test"]').click();

			await expect
				.poll(async () => {
					const text = await clientPage.getByTestId('client-event-count').textContent();
					return Number(text ?? 0);
				})
				.toBeGreaterThan(0);

			const lastEvent = await clientPage.getByTestId('client-last-event').textContent();
			expect(lastEvent ?? '').toContain('/test/session-manager/client');
		} finally {
			await clientPage.close();
			await clientContext.close();
		}
	}, 10_000);
});
