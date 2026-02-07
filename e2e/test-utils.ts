import { Page } from '@playwright/test';
import { Session } from '../src/lib/server/structs/session';
import { Account } from '../src/lib/server/structs/account';

export const signIn = async (page: Page, username: string, password: string) => {
	const account = await Account.Account.get(
		{ username: username },
		{
			type: 'single'
		}
	).unwrap();

	if (!account) {
		throw new Error(`Account with username ${username} not found`);
	}

	await page.goto('/account/sign-in');
	const usernameInput = await page.locator('#user').elementHandle();
	const passwordInput = await page.locator('#password').elementHandle();
	const signInButton = await page.locator('#signInButton').elementHandle();

	if (!usernameInput || !passwordInput || !signInButton) {
		throw new Error('One or more form elements not found');
	}

	await usernameInput.fill(username);
	await passwordInput.fill(password);

	const signInResponse = page.waitForResponse((response) => {
		return response.request().method() === 'POST' && response.url().includes('/account/sign-in');
	});

	await signInButton.click();
	await signInResponse;
	await page.waitForLoadState('networkidle');
	await page
		.waitForURL((url) => !url.pathname.startsWith('/account/sign-in'), {
			timeout: 2000
		})
		.catch(() => {
			// Some tests navigate immediately after sign-in; ignore if redirect is slow.
		});

	const sessions = await Session.Session.get(
		{ accountId: account.id },
		{
			type: 'all'
		}
	).unwrap();

	if (sessions.length === 0) {
		throw new Error('No session found after sign in');
	}

	return sessions;
};

export const logging = (page: Page) => {
	page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
	page.on('pageerror', (err) => console.error('PAGE ERROR:', err));
	page.on('requestfailed', (request) => {
		console.error('Request failed:', request.url(), request.failure());
	});
};
