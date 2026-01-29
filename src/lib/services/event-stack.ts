/**
 * @fileoverview Command stack with undo/redo and keyboard shortcuts.
 *
 * Uses a `StateStack` to manage commands and binds common undo/redo shortcuts.
 *
 * @example
 * import { EventStack } from '$lib/services/event-stack';
 * const stack = new EventStack();
 * stack.init();
 */
import { attemptAsync } from 'ts-utils/check';
import { StateStack } from 'ts-utils/statestack';
import { Keyboard, type KeyCombo } from './keybinds';

/**
 * Command that can be executed and undone.
 *
 * @property {string} [label] - Optional label for UI usage.
 * @property {() => Promise<void> | void} do - Execute the command.
 * @property {() => Promise<void> | void} undo - Undo the command.
 */
export type Command = {
	label?: string;
	do: () => Promise<void> | void;
	undo: () => Promise<void> | void;
};

/**
 * Undo/redo stack with keyboard bindings.
 *
 * @property {EventStack | undefined} current - Active stack instance.
 */
export class EventStack {
	public static current?: EventStack;

	private readonly stack: StateStack<Command>;
	private readonly keyboard: Keyboard;
	private readonly bindings: [KeyCombo, () => void][] = [];
	private initialized = false;

	/**
	 * @param {number} max - Maximum stack depth.
	 * @param {Keyboard | string} [keyboard] - Keyboard instance or DOM selector.
	 */
	constructor(max = 100, keyboard?: Keyboard | string) {
		this.stack = new StateStack<Command>(undefined, { max });

		this.keyboard =
			typeof keyboard === 'string'
				? new Keyboard(keyboard)
				: (keyboard ?? new Keyboard('stack-' + Math.random().toString(36).slice(2, 8)));
	}

	/**
	 * Initializes bindings and marks this stack as current.
	 */
	init() {
		if (this.initialized) return;
		this.initialized = true;

		EventStack.current = this;
		this.keyboard.init?.();

		const bind = (key: KeyCombo, handler: () => void) => {
			this.keyboard.on(key, handler);
			this.bindings.push([key, handler]);
		};

		bind('ctrl+z', () => EventStack.current === this && this.undo());
		bind('ctrl+y', () => EventStack.current === this && this.redo());
		bind('meta+z', () => EventStack.current === this && this.undo());
		bind('meta+y', () => EventStack.current === this && this.redo());
	}

	/**
	 * Removes bindings and deactivates the stack.
	 */
	dispose() {
		for (const [key, fn] of this.bindings) {
			this.keyboard.off(key, fn);
		}
		this.bindings.length = 0;
		this.initialized = false;

		if (EventStack.current === this) {
			EventStack.current = undefined;
		}
	}

	/**
	 * Executes a command and pushes it to the stack.
	 *
	 * @param {Command} command - Command to execute.
	 */
	execute(command: Command) {
		return attemptAsync(async () => {
			this.assertActive();
			await command.do();
			this.stack.add(command);
		});
	}

	/**
	 * Undoes the current command.
	 */
	undo() {
		return attemptAsync(async () => {
			this.assertActive();
			const current = this.stack.current;
			if (!current) return;
			await current.data.undo();
			this.stack.prev();
		});
	}

	/**
	 * Redoes the next command.
	 */
	redo() {
		return attemptAsync(async () => {
			this.assertActive();
			const next = this.stack.next();
			if (!next) return;
			await next.data.do();
		});
	}

	/**
	 * Clears all stack states.
	 */
	clear() {
		this.assertActive();
		this.stack.states.length = 0;
	}

	/**
	 * Ensures the current stack is active.
	 */
	private assertActive() {
		if (!EventStack.current) {
			throw new Error('EventStack not initialized. Call init() first.');
		}
	}

	/**
	 * Whether this stack can undo.
	 */
	get canUndo() {
		return Object.is(EventStack.current, this) && !!this.stack.current?.prev();
	}

	/**
	 * Whether this stack can redo.
	 */
	get canRedo() {
		return Object.is(EventStack.current, this) && !!this.stack.current?.next();
	}

	/**
	 * Event listener registration.
	 */
	get on() {
		return this.stack.on.bind(this.stack);
	}

	/**
	 * Event listener removal.
	 */
	get off() {
		return this.stack.off.bind(this.stack);
	}

	/**
	 * One-time event listener registration.
	 */
	get once() {
		return this.stack.once.bind(this.stack);
	}
}

/**
 * Creates a temporary override stack that can be activated/deactivated.
 */
export const createOverrideStack = () => {
	const stack = new EventStack(50, 'override-layer');
	let previous: EventStack | undefined;

	const activate = () => {
		previous = EventStack.current;
		stack.init();
		EventStack.current = stack;
	};

	const deactivate = () => {
		stack.dispose();
		EventStack.current = previous;
	};

	return { stack, activate, deactivate };
};

/**
 * Creates and binds a command stack to a component lifecycle.
 *
 * @param {string} name - Stack name or keyboard selector.
 * @param {(cb: () => void) => void} onMount - Mount hook.
 * @param {(cb: () => void) => void} onDestroy - Destroy hook.
 */
export const useCommandStack = (
	name: string,
	onMount: (cb: () => void) => void,
	onDestroy: (cb: () => void) => void
) => {
	const stack = new EventStack(100, name);

	onMount(() => stack.init());
	onDestroy(() => stack.dispose());

	return stack;
};
