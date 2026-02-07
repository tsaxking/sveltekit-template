import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

vi.mock('$lib/server/structs/account', () => ({
	Account: {
		globalNotification: vi.fn(() => Promise.resolve())
	}
}));

vi.mock('../lib/server/structs/account', () => ({
	Account: {
		globalNotification: vi.fn(() => Promise.resolve())
	}
}));

describe('Ensure features utilities work correctly', () => {
	let tempDir: string;
	let cwdSpy: ReturnType<typeof vi.spyOn>;
	let features: typeof import('$lib/server/utils/features');

	beforeAll(async () => {
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'features-test-'));
		cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);

		await fs.mkdir(path.join(tempDir, 'static', 'features'), { recursive: true });
		await fs.mkdir(path.join(tempDir, 'private'), { recursive: true });

		const featureA = `---\nname: Feature A\ndescription: First feature\ndate: 2024-01-01\nicon-type: material-icons\nicon-name: star\n---\n\nHello {{ domain }}.`;
		const featureB = `---\nname: Feature B\ndescription: Second feature\ndate: 2024-02-01\nicon-type: bootstrap\nicon-name: bell\n---\n\nBody.`;

		await fs.writeFile(path.join(tempDir, 'static', 'features', 'feature-a.md'), featureA);
		await fs.writeFile(path.join(tempDir, 'static', 'features', 'feature-b.md'), featureB);

		features = await import('$lib/server/utils/features');
	});

	afterAll(async () => {
		cwdSpy?.mockRestore();
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	test('getFeatureMetadata parses required metadata', async () => {
		const meta = (await features.getFeatureMetadata('feature-a').unwrap())!;
		expect(meta.name).toBe('Feature A');
		expect(meta.description).toBe('First feature');
		expect(meta.date).toBeGreaterThan(0);
		expect(meta.icon.type).toBe('material-icons');
		expect(meta.icon.name).toBe('star');
	});

	test('getFeatureList returns features with valid metadata', async () => {
		const list = (await features.getFeatureList().unwrap())!;
		expect(list).toHaveLength(2);
		for (const feature of list) {
			expect(feature.name.length).toBeGreaterThan(0);
			expect(feature.description.length).toBeGreaterThan(0);
			expect(feature.date).toBeGreaterThan(0);
			expect(feature.icon.type.length).toBeGreaterThan(0);
			expect(feature.icon.name.length).toBeGreaterThan(0);
		}
	});

	test('saveListCache and getCachedList persist feature names', async () => {
		await features.saveListCache(['Feature A']).unwrap();
		const cached = await features.getCachedList().unwrap();
		expect(cached).toEqual(['Feature A']);
	});

	test('getFeature replaces config placeholders', async () => {
		const content = await features.getFeature('feature-a', { domain: 'example.com' }).unwrap();
		expect(content).toContain('example.com');
	});

	test('makeFeatureNotifications only notifies for uncached features', async () => {
		const accountModule = await import('$lib/server/structs/account');
		const notify = vi.mocked(accountModule.Account.globalNotification);

		await features.saveListCache(['Feature A']).unwrap();
		await features.makeFeatureNotifications().unwrap();

		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'New Feature: Feature B',
				message: 'Second feature',
				severity: 'info',
				link: '/features/feature-b'
			})
		);

		const cached = await features.getCachedList().unwrap();
		expect(cached.sort()).toEqual(['feature-a', 'feature-b']);
	});
});
