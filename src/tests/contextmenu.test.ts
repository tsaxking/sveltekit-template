/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, test, vi } from 'vitest';

const createElement = (tag: string) => document.createElement(tag);

(globalThis as any).create = (tag: string) => createElement(tag);
(globalThis as any).find = (selector: string) => document.querySelector(selector) as HTMLElement;
(globalThis as any).findAll = (selector: string) =>
	Array.from(document.querySelectorAll(selector)) as HTMLElement[];

describe('contextmenu utilities', () => {
	test('clamps position within viewport and removes on click', async () => {
		Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true });
		Object.defineProperty(window, 'innerHeight', { value: 200, configurable: true });
		const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			width: 200,
			height: 150,
			top: 0,
			left: 0,
			right: 200,
			bottom: 150,
			x: 0,
			y: 0,
			toJSON: () => ({})
		} as DOMRect);

		const event = new MouseEvent('contextmenu', { clientX: 290, clientY: 190, bubbles: true });

		const { contextmenu } = await import('$lib/utils/contextmenu');
		contextmenu(event, {
			options: [
				'Header',
				null,
				{
					name: 'Action',
					icon: { type: 'material-icons', name: 'open_in_new' },
					action: vi.fn()
				}
			],
			width: '200px'
		});

		const menu = document.querySelector('.contextmenu') as HTMLDivElement;
		expect(menu).toBeTruthy();

		const left = parseInt(menu.style.left, 10);
		const top = parseInt(menu.style.top, 10);
		expect(left).toBeLessThanOrEqual(92);
		expect(top).toBeLessThanOrEqual(42);

		await new Promise((resolve) => setTimeout(resolve, 20));
		document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(document.querySelector('.contextmenu')).toBeNull();
		rectSpy.mockRestore();
	});
});
