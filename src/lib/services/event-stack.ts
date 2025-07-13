import { attemptAsync } from 'ts-utils/check';
import { StateStack } from 'ts-utils/statestack';
import { Keyboard, type KeyCombo } from '../utils/keybinds';

export type Command = {
	label?: string;
	do: () => Promise<void> | void;
	undo: () => Promise<void> | void;
};

export class EventStack {
	public static current?: EventStack;

	private readonly stack: StateStack<Command>;
	private readonly keyboard: Keyboard;
	private readonly bindings: [KeyCombo, () => void][] = [];
	private initialized = false;

	constructor(max = 100, keyboard?: Keyboard | string) {
		this.stack = new StateStack<Command>(undefined, { max });

		this.keyboard =
			typeof keyboard === 'string'
				? new Keyboard(keyboard)
				: (keyboard ?? new Keyboard('stack-' + Math.random().toString(36).slice(2, 8)));
	}

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

	execute(command: Command) {
		return attemptAsync(async () => {
			this.assertActive();
			await command.do();
			this.stack.add(command);
		});
	}

	undo() {
		return attemptAsync(async () => {
			this.assertActive();
			const current = this.stack.current;
			if (!current) return;
			await current.data.undo();
			this.stack.prev();
		});
	}

	redo() {
		return attemptAsync(async () => {
			this.assertActive();
			const next = this.stack.next();
			if (!next) return;
			await next.data.do();
		});
	}

	clear() {
		this.assertActive();
		this.stack.states.length = 0;
	}

	private assertActive() {
		if (!EventStack.current) {
			throw new Error('EventStack not initialized. Call init() first.');
		}
	}

	get canUndo() {
		return Object.is(EventStack.current, this) && !!this.stack.current?.prev();
	}

	get canRedo() {
		return Object.is(EventStack.current, this) && !!this.stack.current?.next();
	}

	get on() {
		return this.stack.on.bind(this.stack);
	}

	get off() {
		return this.stack.off.bind(this.stack);
	}

	get once() {
		return this.stack.once.bind(this.stack);
	}
}

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
