import { test, expect } from '@playwright/test';

/**
 * Simplified Service Worker Cache Tests
 * Focuses on core functionality that's easier to test reliably
 */

test.describe('Service Worker Core Functionality', () => {
	test('should register service worker and load configuration', async ({ page }) => {
		await page.goto('/');

		// Wait for service worker registration
		const isRegistered = await page.waitForFunction(
			() => navigator.serviceWorker.getRegistration().then((reg) => !!reg),
			{ timeout: 10000 }
		);

		expect(isRegistered).toBeTruthy();

		// Test cache config endpoint
		const response = await page.request.get('/api/cache-config');
		expect(response.ok()).toBe(true);

		const config = await response.json();
		expect(config).toMatchObject({
			enabled: expect.any(Boolean),
			version: expect.any(Number),
			static: expect.objectContaining({
				enabled: expect.any(Boolean),
				duration: expect.any(Number),
				limit: expect.any(Number),
				assets: expect.any(Array)
			}),
			api: expect.objectContaining({
				enabled: expect.any(Boolean),
				duration: expect.any(Number),
				limit: expect.any(Number),
				assets: expect.any(Array)
			}),
			pages: expect.objectContaining({
				enabled: expect.any(Boolean),
				duration: expect.any(Number),
				limit: expect.any(Number),
				assets: expect.any(Array)
			})
		});
	});

	test('should create appropriate caches based on configuration', async ({ page }) => {
		await page.goto('/');

		// Wait for service worker to be ready
		await page.waitForFunction(
			async () => {
				const registration = await navigator.serviceWorker.getRegistration();
				return registration && registration.active;
			},
			{ timeout: 15000 }
		);

		// Wait longer for cache initialization
		await page.waitForTimeout(8000);

		// Make some requests to trigger cache creation
		await page.goto('/api/user');
		await page.waitForTimeout(2000);
		await page.goto('/');
		await page.waitForTimeout(2000);

		const cacheInfo = await page.evaluate(async () => {
			const cacheNames = await caches.keys();
			return {
				cacheNames,
				hasStatic: cacheNames.some((name) => name.startsWith('static-')),
				hasApi: cacheNames.some((name) => name.startsWith('api-')),
				hasPages: cacheNames.some((name) => name.startsWith('pages-')),
				hasImages: cacheNames.some((name) => name.includes('image') || name.startsWith('static-'))
			};
		});

		// At least one cache should be created
		expect(cacheInfo.cacheNames.length).toBeGreaterThan(0);

		// Some cache should exist - either static, pages, or api
		expect(cacheInfo.hasStatic || cacheInfo.hasPages || cacheInfo.hasApi).toBe(true);
	});
	test('should cache static assets correctly', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(2000);

		// Request a static asset
		const faviconResponse = await page.goto('/favicon.png');
		expect(faviconResponse?.ok()).toBe(true);

		// Check if it was cached
		const isFaviconCached = await page.evaluate(async () => {
			const cacheNames = await caches.keys();
			const staticCache = cacheNames.find((name) => name.startsWith('static-'));

			if (!staticCache) return false;

			const cache = await caches.open(staticCache);
			const cachedResponse = await cache.match('/favicon.png');
			return !!cachedResponse;
		});

		expect(isFaviconCached).toBe(true);
	});

	test('should handle offline gracefully', async ({ page }) => {
		// First, load the page normally to populate caches
		await page.goto('/');
		await page.waitForTimeout(3000);

		// Then simulate offline by blocking network requests
		await page.route('**/*', (route) => {
			const url = route.request().url();
			// Allow service worker itself and cached assets
			if (url.includes('.js') || url.includes('.css') || url.includes('favicon')) {
				route.continue();
			} else {
				route.abort('internetdisconnected');
			}
		});

		// Try to load the page again
		const response = await page.goto('/', {
			waitUntil: 'domcontentloaded',
			timeout: 10000
		});

		// Should either get cached content or offline page
		expect(response?.status()).toBeLessThan(500);

		const content = await page.content();
		expect(content.length).toBeGreaterThan(100); // Should have some content
	});

	test('should respect cache patterns from configuration', async ({ page }) => {
		await page.goto('/');

		// Get the configuration
		const config = await page.request.get('/api/cache-config').then((r) => r.json());

		// Test pattern matching logic
		const patternTests = await page.evaluate((config) => {
			// Recreate the pattern matching logic from service worker
			function patternToRegex(pattern) {
				let regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\\\$&').replace(/\\*/g, '.*');

				if (regexPattern.startsWith('/')) {
					regexPattern = '^' + regexPattern;
				}

				if (regexPattern.endsWith('/.*')) {
					// Keep as is
				} else if (!regexPattern.includes('.*')) {
					regexPattern = regexPattern + '$';
				}

				return new RegExp(regexPattern);
			}

			function matchesPatterns(pathname, patterns) {
				if (patterns.includes('/*')) return true;

				return patterns.some((pattern) => {
					const regex = patternToRegex(pattern);
					return regex.test(pathname);
				});
			}

			return {
				staticMatch: matchesPatterns('/favicon.png', config.static.assets),
				apiMatch: matchesPatterns('/api/test', config.api.assets),
				pageMatch: matchesPatterns('/', config.pages.assets)
			};
		}, config);

		// Verify pattern matching works as expected
		expect(patternTests.staticMatch).toBe(true); // Should match /*
		expect(patternTests.pageMatch).toBe(true); // Should match /*

		// API match depends on configuration
		const hasApiWildcard =
			config.api.assets.includes('/*') ||
			config.api.assets.some((asset: string) => asset.startsWith('/api'));
		if (hasApiWildcard) {
			expect(patternTests.apiMatch).toBe(true);
		}
	});

	test('should include version in cache names', async ({ page }) => {
		await page.goto('/');
		await page.waitForTimeout(2000);

		const config = await page.request.get('/api/cache-config').then((r) => r.json());

		const cacheNames = await page.evaluate(async () => {
			return await caches.keys();
		});

		// All cache names should include the version
		const versionString = config.version.toString();
		cacheNames.forEach((cacheName) => {
			expect(cacheName).toContain(versionString);
		});
	});
});
