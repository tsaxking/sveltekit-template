import { describe, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$app/environment', () => ({ browser: true }));

vi.mock('svelte', async () => {
	const actual = (await vi.importActual('svelte')) as typeof import('svelte');
	return {
		...actual,
		mount: vi.fn(() => ({
			show: vi.fn(),
			hide: vi.fn(),
			on: vi.fn(),
			once: vi.fn(),
			off: vi.fn()
		})),
		unmount: vi.fn()
	};
});

describe('prompts utilities', () => {
	test('modalTarget exists and clearModals removes children', async () => {
		const prompts = await import('$lib/utils/prompts');
		expect(prompts.modalTarget).toBeTruthy();
		const child = document.createElement('div');
		prompts.modalTarget?.appendChild(child);
		await prompts.clearModals();
		expect(prompts.modalTarget?.children.length).toBe(0);
	});

	test('notify updates history and mounts alert', async () => {
		const prompts = await import('$lib/utils/prompts');
		prompts.history.set([]);
		const mounted = prompts.notify({
			title: 'Hello',
			message: 'World',
			color: 'primary'
		});
		expect(mounted).toBeTruthy();
		expect(get(prompts.history)).toHaveLength(1);
		expect(get(prompts.history)[0]?.title).toBe('Hello');
	});
});
