import { describe, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';

vi.mock('$lib/services/keybinds', () => ({
	Keyboard: { on: vi.fn() }
}));

describe('Stack utilities', () => {
	test('push, undo, redo, clear update state', async () => {
		const { Stack } = await import('$lib/utils/stack');
		const stack = new Stack({ name: 'test' });
		Stack.use(stack);

		let value = 0;
		stack.push({
			name: 'inc',
			do: () => {
				value += 1;
			},
			undo: () => {
				value -= 1;
			}
		});

		expect(value).toBe(1);
		expect(get(Stack.prev)).toBe(true);
		expect(get(Stack.next)).toBe(false);

		stack.undo();
		expect(value).toBe(0);
		expect(get(Stack.prev)).toBe(false);
		expect(get(Stack.next)).toBe(true);

		stack.redo();
		expect(value).toBe(1);
		expect(get(Stack.prev)).toBe(true);

		stack.clear();
		expect(stack.items.length).toBe(0);
		expect(get(Stack.prev)).toBe(false);
		expect(get(Stack.next)).toBe(false);
	});
});
