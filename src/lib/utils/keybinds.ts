// keybinds.ts
import { browser } from '$app/environment';

export type Modifier = 'ctrl' | 'shift' | 'alt' | 'meta';
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

type ComboPrefix =
	| `${Modifier}+`
	| `${Modifier}+${Modifier}+`
	| `${Modifier}+${Modifier}+${Modifier}+`
	| '';

export type KeyCombo = `${ComboPrefix}${KeyName}`;

type KeyFn = () => void;

export class Keyboard {
	private static readonly keyboards = new Map<string, Keyboard>();
	private static _current = new Keyboard('default');
	private static readonly global = new Map<string, KeyFn[]>();

	public static get all() {
		return Array.from(Keyboard.keyboards.values());
	}

	public static get default() {
		return Keyboard._current;
	}

	public static get current() {
		return Keyboard._current;
	}

	public static use(keyboard: Keyboard) {
		this._current = keyboard;
	}

	public static on(key: KeyCombo, fn: KeyFn) {
		const fns = this.global.get(key) || [];
		fns.push(fn);
		this.global.set(key, fns);
	}

	public static off(key: KeyCombo, fn: KeyFn) {
		const fns = this.global.get(key) || [];
		const index = fns.indexOf(fn);
		if (index !== -1) fns.splice(index, 1);
	}

	public static get(key: KeyCombo) {
		return this._current.listeners.get(key) || this.global.get(key);
	}

	constructor(public readonly name: string) {
		Keyboard.keyboards.set(name, this);
	}

	private readonly listeners = new Map<string, KeyFn[]>();

	public on(key: KeyCombo, fn: KeyFn) {
		const fns = this.listeners.get(key) || [];
		fns.push(fn);
		this.listeners.set(key, fns);

		return () => this.off(key, fn);
	}

	public off(key: KeyCombo, fn: KeyFn) {
		const fns = this.listeners.get(key) || [];
		const index = fns.indexOf(fn);
		if (index !== -1) fns.splice(index, 1);
	}

	public combine(...keyboard: Keyboard[]) {
		for (const kb of keyboard) {
			for (const [key, fns] of kb.listeners) {
				const current = this.listeners.get(key) || [];
				this.listeners.set(key, current.concat(fns));
			}
		}
	}

	public init() {
		Keyboard.use(this);
	}
}

if (browser) {
	document.addEventListener('keydown', (e) => {
		const mods = [
			e.ctrlKey ? 'ctrl' : '',
			e.altKey ? 'alt' : '',
			e.shiftKey ? 'shift' : '',
			e.metaKey ? 'meta' : ''
		].filter(Boolean);

		const key = [...mods, e.key.toLowerCase()].join('+') as KeyCombo;
		const [fn] = Keyboard.get(key) || [];
		if (fn) {
			e.preventDefault();
			fn();
		}
	});

	Object.assign(window, { Keyboard });
}
