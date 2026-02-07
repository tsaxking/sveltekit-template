import * as testing from '@playwright/test';
import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db';
import { Session } from '../src/lib/server/structs/session';

const expect = testing.expect;
const test = testing.test;
const describe = testing.default.describe;
const beforeAll = testing.default.beforeAll;

beforeAll(async () => {
	await Struct.buildAll(DB).unwrap();
});

describe('Fingerprinting', () => {
	test('creates fpid cookie and saves fingerprint on session', async ({ page }) => {
		let setCookieHeader: string | undefined;
		page.on('response', (response) => {
			const header = response.headers()['set-cookie'];
			if (header?.includes('fpid=')) {
				setCookieHeader = header;
			}
		});

		await page.goto('/test/fingerprint');
		const status = page.locator('#fingerprintStatus');
		await status.waitFor({ state: 'visible' });
		await page.waitForFunction(() => {
			const el = document.querySelector('#fingerprintStatus');
			return el?.getAttribute('data-status') === 'ok';
		});

		const fingerprintValue = await status.getAttribute('data-message');
		expect(fingerprintValue).toBeTruthy();
		expect(setCookieHeader).toBeTruthy();

		const sessions = await Session.Session.get(
			{ fingerprint: String(fingerprintValue) },
			{ type: 'all' }
		).unwrap();
		expect(sessions.length).toBeGreaterThan(0);
		expect(sessions[0]?.data.fingerprint).toBeTruthy();
	});
});
