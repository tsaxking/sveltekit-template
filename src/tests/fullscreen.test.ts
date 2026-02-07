/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

describe('fullscreen utilities', () => {
	test('fullscreen returns exit function and calls exitFullscreen', async () => {
		const exitFullscreen = vi.fn();
		Object.defineProperty(document, 'fullscreenElement', {
			value: {},
			configurable: true
		});
		(document as any).exitFullscreen = exitFullscreen;

		const { fullscreen } = await import('$lib/utils/fullscreen');
		const exit = fullscreen();
		expect(typeof exit).toBe('function');

		exit();
		expect(exitFullscreen).toHaveBeenCalled();
	});
});
