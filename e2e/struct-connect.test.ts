import { expect, test } from '@playwright/test';
import { logging } from './test-utils';

test('Struct connections', async ({ page }) => {
	await page.goto('/test/struct');
	logging(page);

	const status = await page.locator('#status').elementHandle();
	if (!status) {
		throw new Error('No test list found');
	}

	await status.waitForElementState('visible');

	const pass = await status.getAttribute('data-pass');
	expect(pass).toBe('true');
});
