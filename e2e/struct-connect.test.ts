import { expect, test } from '@playwright/test';

test('Front end data management', async ({ page }) => {
	await page.goto('/test/struct');
	page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
	page.on('pageerror', (err) => console.error('PAGE ERROR:', err));
	page.on('requestfailed', (request) => {
		console.error('Request failed:', request.url(), request.failure());
	});

	const status = await page.locator('#status').elementHandle();
	if (!status) {
		throw new Error('No test list found');
	}

	await status.waitForElementState('visible');

	const pass = await status.getAttribute('data-pass');
	expect(pass).toBe('true');
});
