/**
 * Keyboard shortcut management system
 *
 * Provides a flexible system for managing keyboard shortcuts with support for:
 * - Multiple keyboard contexts that can be switched between
 * - Global shortcuts that work across all contexts
 * - Modifier key combinations (ctrl, shift, alt, meta)
 * - Automatic event handling and prevention of default browser behavior
 */
import { browser } from '$app/environment';

/** Supported modifier keys for keyboard combinations */
export type Modifier = 'ctrl' | 'shift' | 'alt' | 'meta';

/** Supported key names for keyboard shortcuts */
export type KeyName =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z'
	| 'ArrowUp'
	| 'ArrowDown'
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'Enter'
	| 'Escape'
	| 'Tab'
	| 'Backspace'
	| 'Delete'
	| 'Home'
	| 'End'
	| 'PageUp'
	| 'PageDown'
	| 'F1'
	| 'F2'
	| 'F3'
	| 'F4'
	| 'F5'
	| 'F6'
	| 'F7'
	| 'F8'
	| 'F9'
	| 'F10'
	| 'F11'
	| 'F12'
	| ' ';

/** Template for building modifier key combinations (0-3 modifiers) */
type ComboPrefix =
	| `${Modifier}+`
	| `${Modifier}+${Modifier}+`
	| `${Modifier}+${Modifier}+${Modifier}+`
	| '';

/**
 * A keyboard combination string (e.g., 'ctrl+z', 'ctrl+shift+s', 'Enter')
 * Modifiers are separated by '+' and must come before the key name
 */
export type KeyCombo = `${ComboPrefix}${KeyName}`;

/** Function type for keyboard event handlers */
type KeyFn = () => void;

/**
 * Keyboard shortcut management system supporting multiple contexts and global shortcuts.
 *
 * Features:
 * - Multiple keyboard contexts that can be switched between
 * - Global shortcuts that work regardless of active context
 * - Automatic modifier key handling and event prevention
 * - Context combination for complex shortcut hierarchies
 */
export class Keyboard {
	/** Registry of all keyboard instances by name */
	private static readonly keyboards = new Map<string, Keyboard>();

	/** The currently active keyboard context */
	private static _current = new Keyboard('default');

	/** Global shortcuts that work in any context */
	private static readonly global = new Map<string, KeyFn[]>();

	/**
	 * Gets all registered keyboard instances
	 */
	public static get all() {
		return Array.from(Keyboard.keyboards.values());
	}

	/**
	 * Gets the default keyboard instance
	 */
	public static get default() {
		return Keyboard._current;
	}

	/**
	 * Gets the currently active keyboard instance
	 */
	public static get current() {
		return Keyboard._current;
	}

	/**
	 * Sets the active keyboard context
	 * @param keyboard - The keyboard instance to make active
	 */
	public static use(keyboard: Keyboard) {
		this._current = keyboard;
	}

	/**
	 * Registers a global keyboard shortcut that works in any context
	 * @param key - The key combination (e.g., 'ctrl+z')
	 * @param fn - The function to call when the shortcut is triggered
	 */
	public static on(key: KeyCombo, fn: KeyFn) {
		const fns = this.global.get(key) || [];
		fns.push(fn);
		this.global.set(key, fns);
	}

	/**
	 * Removes a global keyboard shortcut
	 * @param key - The key combination to remove
	 * @param fn - The specific function to remove
	 */
	public static off(key: KeyCombo, fn: KeyFn) {
		const fns = this.global.get(key) || [];
		const index = fns.indexOf(fn);
		if (index !== -1) fns.splice(index, 1);
	}

	/**
	 * Gets all handlers for a key combination from current context or global
	 * @param key - The key combination to look up
	 * @returns Array of handler functions, or undefined if none found
	 */
	public static get(key: KeyCombo) {
		return this._current.listeners.get(key) || this.global.get(key);
	}

	/**
	 * Creates a new keyboard context
	 * @param name - Unique name for this keyboard context
	 */
	constructor(public readonly name: string) {
		Keyboard.keyboards.set(name, this);
	}

	/** Map of key combinations to their handler functions for this context */
	private readonly listeners = new Map<string, KeyFn[]>();

	/**
	 * Registers a keyboard shortcut for this specific context
	 * @param key - The key combination (e.g., 'ctrl+s')
	 * @param fn - The function to call when triggered
	 * @returns Cleanup function to remove this shortcut
	 */
	public on(key: KeyCombo, fn: KeyFn) {
		const fns = this.listeners.get(key) || [];
		fns.push(fn);
		this.listeners.set(key, fns);

		return () => this.off(key, fn);
	}

	/**
	 * Removes a keyboard shortcut from this context
	 * @param key - The key combination to remove
	 * @param fn - The specific function to remove
	 */
	public off(key: KeyCombo, fn: KeyFn) {
		const fns = this.listeners.get(key) || [];
		const index = fns.indexOf(fn);
		if (index !== -1) fns.splice(index, 1);
	}

	/**
	 * Merges shortcuts from other keyboard contexts into this one
	 * @param keyboard - One or more keyboard contexts to merge
	 */
	public combine(...keyboard: Keyboard[]) {
		for (const kb of keyboard) {
			for (const [key, fns] of kb.listeners) {
				const current = this.listeners.get(key) || [];
				this.listeners.set(key, current.concat(fns));
			}
		}
	}

	/**
	 * Makes this keyboard context the active one
	 */
	public init() {
		Keyboard.use(this);
	}
}

// Browser-only initialization
if (browser) {
	/**
	 * Global keydown event listener that handles all keyboard shortcuts.
	 * Automatically prevents default browser behavior when a shortcut is triggered.
	 */
	document.addEventListener('keydown', (e) => {
		const mods = [
			e.ctrlKey ? 'ctrl' : '',
			e.altKey ? 'alt' : '',
			e.shiftKey ? 'shift' : '',
			e.metaKey ? 'meta' : ''
		].filter(Boolean);

		const key = [...mods, e.key.toLowerCase()].join('+') as KeyCombo;

		const handlers = Keyboard.get(key);
		if (handlers && handlers.length > 0) {
			e.preventDefault();
			handlers.forEach((fn) => fn());
		}
	});

	// Expose Keyboard class to window for debugging
	Object.assign(window, { Keyboard });
}
