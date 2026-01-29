/**
 * @fileoverview Global undo/redo stack with keyboard shortcuts.
 *
 * @example
 * import { Stack } from '$lib/utils/stack';
 * const stack = new Stack({ name: 'editor' });
 * Stack.use(stack);
 */
import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { Keyboard } from '../services/keybinds';
import { EventEmitter } from 'ts-utils/event-emitter';

/**
 * Represents a single state in the undo/redo stack.
 * Can either have separate redo function or use 'do' for both initial action and redo.
 */
type State =
	| {
			/** Human-readable name for debugging */
			name: string;
			/** Function to undo this state */
			undo: () => void;
			/** Function to redo this state */
			redo: () => void;
	  }
	| {
			/** Human-readable name for debugging */
			name: string;
			/** Function to undo this state */
			undo: () => void;
			/** Function to execute this state (used for both initial action and redo) */
			do: () => void;
	  };

/**
 * A global undo/redo stack manager that supports multiple stack instances.
 * Only one stack can be active at a time, controlled via Stack.use().
 *
 * Features:
 * - Global keyboard shortcuts (Ctrl+Z, Ctrl+Y)
 * - Reactive stores for UI button states (prev/next)
 * - Event system for monitoring stack operations across all instances
 * - Debug logging support
 * - Automatic state management
 *
 * Events emitted:
 * - 'push': When a new state is added to any stack
 * - 'undo': When a state is undone in any stack
 * - 'redo': When a state is redone in any stack
 * - 'clear': When any stack is cleared
 * - 'error': When an error occurs during operations
 */
export class Stack {
	/** The currently active stack instance */
	public static current?: Stack;

	/**
	 * Global event emitter for stack operations.
	 * Emits events for all stack operations across all instances.
	 */
	private static readonly em = new EventEmitter<{
		/** Fired when a state is undone (includes the undone state) */
		undo: State;
		/** Fired when a state is redone (includes the redone state) */
		redo: State;
		/** Fired when an error occurs during stack operations */
		error: Error;
		/** Fired when a new state is pushed to any stack (includes the new state) */
		push: State;
		/** Fired when any stack is cleared */
		clear: undefined;
	}>();

	/** Internal method to emit events - do not use directly */
	private static readonly emit = this.em.emit.bind(this.em);

	/**
	 * Subscribe to global stack events across all instances
	 * @param event - The event type to listen for
	 * @param handler - Function to call when event is emitted
	 * @returns Unsubscribe function
	 */
	public static readonly on = this.em.on.bind(this.em);

	/**
	 * Unsubscribe from global stack events
	 * @param event - The event type to stop listening for
	 * @param handler - The specific handler function to remove
	 */
	public static readonly off = this.em.off.bind(this.em);

	/**
	 * Subscribe to a global stack event that will only fire once
	 * @param event - The event type to listen for
	 * @param handler - Function to call when event is emitted
	 * @returns Unsubscribe function
	 */
	public static readonly once = this.em.once.bind(this.em);

	/**
	 * Performs an undo operation on the current active stack
	 */
	public static undo() {
		if (Stack.current) {
			Stack.current.undo();
		}
	}

	/**
	 * Performs a redo operation on the current active stack
	 */
	public static redo() {
		if (Stack.current) {
			Stack.current.redo();
		}
	}

	/**
	 * Sets the given stack as the currently active stack.
	 * Clears the previous stack and updates UI state.
	 * @param stack - The stack instance to make active
	 */
	public static use(stack: Stack) {
		Stack.current?.clear();
		if (stack.config.debug) console.log('Now using stack', stack.name);
		Stack.current = stack;
		Stack.setState();
	}

	/** Svelte store indicating if redo is available (true = can redo) */
	public static readonly next = writable(false);

	/** Svelte store indicating if undo is available (true = can undo) */
	public static readonly prev = writable(false);

	/**
	 * Updates the prev/next stores based on current stack state.
	 * Called automatically after stack operations.
	 */
	public static setState() {
		if (Stack.current) {
			const items = Stack.current.items.length;
			const index = Stack.current.index;

			// prev (undo) is available when there are items to undo (index >= 0)
			this.prev.set(index >= 0);

			// next (redo) is available when there are items to redo (index < items - 1)
			this.next.set(index < items - 1);
		} else {
			this.prev.set(false);
			this.next.set(false);
		}
	}

	/**
	 * Creates a new Stack instance
	 * @param config - Configuration object
	 * @param config.name - Human-readable name for this stack (used in debugging)
	 * @param config.debug - Whether to enable debug logging (optional, default: false)
	 */
	constructor(
		public readonly config: {
			name: string;
			debug?: boolean;
		}
	) {}

	/** Internal array of state items */
	private _items: State[] = [];

	/** Current position in the stack (-1 = no items, 0+ = index of current item) */
	private index = -1;

	/**
	 * Read-only access to the items array
	 */
	public get items() {
		return this._items;
	}

	/**
	 * Gets the name of this stack
	 */
	public get name() {
		return this.config.name;
	}

	/**
	 * Pushes a new state onto the stack and executes it.
	 * This will remove any items after the current index (destroying redo history).
	 * @param state - The state to add and execute
	 */
	push(state: State) {
		this.log('push', state.name);
		this.items.splice(this.index + 1);
		this.items.push(state);
		this.index++;

		if ('do' in state) {
			state.do();
		}

		Stack.setState();
		Stack.emit('push', state);
	}

	/**
	 * Undoes the current state if possible.
	 * Moves the index back by one and calls the undo function.
	 */
	undo() {
		if (this.index >= 0) {
			this.log('undo', this.items[this.index].name);
			this.items[this.index].undo();
			this.index--;
			Stack.setState();
			Stack.emit('undo', this.items[this.index + 1]);
		}
	}

	/**
	 * Redoes the next state if possible.
	 * Moves the index forward by one and calls the appropriate function.
	 */
	redo() {
		if (this.index < this.items.length - 1) {
			this.index++;
			this.log('redo', this.items[this.index].name);
			const item = this.items[this.index];
			if ('do' in item) item.do();
			else item.redo();
			Stack.setState();
			Stack.emit('redo', item);
		}
	}

	/**
	 * Clears all items from the stack and resets the index.
	 * Updates the global state after clearing.
	 */
	clear() {
		this._items = [];
		this.index = -1;
		Stack.setState();
		Stack.emit('clear', undefined);
	}

	/**
	 * Logs debug information if debug mode is enabled
	 * @param args - Arguments to log
	 */
	log(...args: unknown[]) {
		if (this.config.debug) console.log('Stack: ', this.name, ...args);
	}
}

/**
 * Global keyboard shortcuts for undo/redo operations.
 * These work regardless of which stack is currently active.
 *
 * Shortcuts:
 * - Ctrl+Z: Undo the last action
 * - Ctrl+Y: Redo the next action
 */
Keyboard.on('ctrl+z', () => Stack.undo());
Keyboard.on('ctrl+y', () => Stack.redo());

/**
 * Browser-only: Expose Stack class to window object for debugging.
 * Allows access to Stack in browser dev tools for inspection and testing.
 */
if (browser) {
	Object.assign(window, { Stack });
}
