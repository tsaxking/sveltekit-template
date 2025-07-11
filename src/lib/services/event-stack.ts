// command-stack.ts
import { attemptAsync } from 'ts-utils/check';
import { StateStack } from 'ts-utils/statestack';
import { Keyboard, type KeyCombo } from '../utils/keybinds';

export type Command = {
	label?: string;
	do: () => Promise<void> | void;
	undo: () => Promise<void> | void;
};

export class CommandStack {
	public static current?: CommandStack;

	private readonly stack: StateStack<Command>;
	private readonly keyboard: Keyboard;
	private readonly bindings: [KeyCombo, () => void][] = [];

	constructor(max = 100, keyboard?: Keyboard | string) {
		this.stack = new StateStack<Command>(undefined, { max });
		this.keyboard =
			typeof keyboard === 'string'
				? new Keyboard(keyboard)
				: (keyboard ?? new Keyboard('commandstack-' + Math.random().toString(36).substring(2, 10)));
	}

	init() {
		CommandStack.current = this;

		const bind = (key: KeyCombo, handler: () => void) => {
			this.keyboard.on(key, handler);
			this.bindings.push([key, handler]);
		};

		bind('ctrl+z', () => CommandStack.current === this && this.undo());
		bind('ctrl+y', () => CommandStack.current === this && this.redo());
		bind('meta+z', () => CommandStack.current === this && this.undo());
		bind('meta+y', () => CommandStack.current === this && this.redo());
	}

	dispose() {
		for (const [key, fn] of this.bindings) {
			this.keyboard.off(key, fn);
		}
		this.bindings.length = 0;

		if (CommandStack.current === this) {
			CommandStack.current = undefined;
		}
	}

	private testCurrent() {
		if (!CommandStack.current) {
			throw new Error('CommandStack not initialized. Call init() first.');
		}
	}

	execute(command: Command) {
		return attemptAsync(async () => {
			this.testCurrent();
			await command.do();
			this.stack.add(command);
		});
	}

	undo() {
		return attemptAsync(async () => {
			this.testCurrent();
			const current = this.stack.current;
			if (!current) return;
			await current.data.undo();
			this.stack.prev();
		});
	}

	redo() {
		return attemptAsync(async () => {
			this.testCurrent();
			const next = this.stack.next();
			if (!next) return;
			await next.data.do();
		});
	}

	clear() {
		this.testCurrent();
		this.stack.states.length = 0;
	}

	get canUndo() {
		return Object.is(CommandStack.current, this) && !!this.stack.current?.prev();
	}

	get canRedo() {
		return Object.is(CommandStack.current, this) && !!this.stack.current?.next();
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

export const createOverride = () => {
	const stack = new CommandStack(50, 'modal-layer');

	let previous: CommandStack | undefined;

	const activate = () => {
		previous = CommandStack.current;
		stack.init();
		CommandStack.current = stack;
	};

	const deactivate = () => {
		stack.dispose();
		CommandStack.current = previous;
	};

	return { stack, activate, deactivate };
};
