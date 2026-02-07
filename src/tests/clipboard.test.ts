/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi } from 'vitest';

vi.mock('$lib/utils/prompts', () => ({
	notify: vi.fn()
}));

describe('clipboard utilities', () => {
	test('copy writes text and triggers notification when requested', async () => {
		const writeText = vi.fn();
		Object.assign(navigator, {
			clipboard: {
				writeText
			}
		});

		const { copy } = await import('$lib/utils/clipboard');
		copy('hello', true);

		const { notify } = await import('$lib/utils/prompts');
		expect(writeText).toHaveBeenCalledWith('hello');
		expect(notify).toHaveBeenCalledTimes(1);
	});

	test('copyCanvas writes clipboard item', async () => {
		const write = vi.fn();
		Object.assign(navigator, {
			clipboard: {
				write
			}
		});

		(globalThis as any).ClipboardItem = class ClipboardItem {
			constructor(public data: Record<string, Blob>) {}
		};

		const canvas = document.createElement('canvas');
		(canvas as HTMLCanvasElement).toBlob = (cb) => cb(new Blob(['x'], { type: 'image/png' }));

		const { copyCanvas } = await import('$lib/utils/clipboard');
		await copyCanvas(canvas, false).unwrap();

		expect(write).toHaveBeenCalledTimes(1);
	});

	test('copyImage fetches blob and writes clipboard item', async () => {
		const write = vi.fn();
		Object.assign(navigator, {
			clipboard: {
				write
			}
		});

		(globalThis as any).ClipboardItem = class ClipboardItem {
			constructor(public data: Record<string, Blob>) {}
		};

		global.fetch = vi.fn(async () => new Response(new Blob(['x'], { type: 'image/png' })));

		const img = new Image();
		img.src = 'https://example.com/test.png';

		const { copyImage } = await import('$lib/utils/clipboard');
		await copyImage(img, false).unwrap();

		expect(write).toHaveBeenCalledTimes(1);
	});
});
