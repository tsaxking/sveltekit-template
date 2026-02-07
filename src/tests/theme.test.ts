import { describe, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/environment', () => ({ browser: true }));

describe('theme utilities', () => {
	test('setTheme updates store and persists', async () => {
		const { setTheme, theme } = await import('$lib/utils/theme');
		setTheme('dark');
		expect(get(theme)).toBe('dark');
		expect(document.body.getAttribute('data-bs-theme')).toBe('dark');
		expect(localStorage.getItem('theme')).toBe('dark');
	});

	test('initializes from localStorage when present', async () => {
		localStorage.setItem('theme', 'dark');
		vi.resetModules();
		const { theme } = await import('$lib/utils/theme');
		expect(get(theme)).toBe('dark');
	});
});
