/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Subscriber, Unsubscriber, Writable } from 'svelte/store';
import { debounce } from 'ts-utils';

/**
 * Base writable store implementation with debounced updates and lifecycle management.
 * Provides a foundation for reactive data stores with performance optimizations.
 *
 * @export
 * @class WritableBase
 * @typedef {WritableBase}
 * @template T - The type of data stored in this writable
 * @implements {Writable<T>}
 */
export class WritableBase<T> implements Writable<T> {
	/**
	 * Creates an instance of WritableBase.
	 *
	 * @constructor
	 * @param {T} data - Initial data value
	 * @param {object} [_config] - Optional configuration
	 * @param {number} [_config.debounceMs=0] - Debounce delay in milliseconds for updates
	 */
	constructor(
		public data: T,
		private _config?: {
			debounceMs?: number;
		}
	) {
		this._informDebounced = debounce(() => {
			this._informImmediate();
		}, this._config?.debounceMs ?? 0);
	}

	/**
	 * Set of active subscribers to this writable store
	 *
	 * @public
	 * @type {Set<Subscriber<T>>}
	 */
	subscribers = new Set<Subscriber<T>>();

	/**
	 * Subscribes to changes in this writable store (Svelte store interface)
	 *
	 * @param {Subscriber<T>} run - Callback function that receives the current data
	 * @returns {Unsubscriber} Function to unsubscribe from updates
	 * @example
	 * ```typescript
	 * const store = new WritableBase('initial');
	 * const unsubscribe = store.subscribe(value => console.log(value));
	 * ```
	 */
	subscribe(run: Subscriber<T>): Unsubscriber {
		run(this.data);
		this.subscribers.add(run);
		return () => {
			this.subscribers.delete(run);
			if (this.subscribers.size === 0) {
				for (const callback of this._onAllUnsubscribeCallbacks) {
					callback();
				}
			}
		};
	}

	/**
	 * Immediately notifies all subscribers of the current data
	 *
	 * @private
	 * @returns {void}
	 */
	_informImmediate() {
		for (const subscriber of this.subscribers) {
			subscriber(this.data);
		}
	}

	/**
	 * Debounced version of _informImmediate for performance optimization
	 *
	 * @private
	 * @type {() => void}
	 */
	_informDebounced: () => void;

	/**
	 * Notifies subscribers of data changes, optionally with immediate or debounced delivery
	 *
	 * @param {boolean} [immediate=false] - If true, notifies immediately; otherwise debounced
	 * @returns {void}
	 */
	inform(immediate = false) {
		if (immediate) {
			this._informImmediate();
		} else {
			this._informDebounced();
		}
	}

	/**
	 * Sets the data to a new value and notifies subscribers (Svelte store interface)
	 *
	 * @param {T} value - New data value
	 * @returns {void}
	 * @example
	 * ```typescript
	 * store.set('new value');
	 * ```
	 */
	set(value: T): void {
		this.data = value;
		this.inform();
	}

	/**
	 * Updates the data using an updater function and notifies subscribers (Svelte store interface)
	 *
	 * @param {(value: T) => T} fn - Function that receives current data and returns new data
	 * @returns {void}
	 * @example
	 * ```typescript
	 * store.update(current => current + 1);
	 * ```
	 */
	update(fn: (value: T) => T): void {
		this.set(fn(this.data));
	}

	/**
	 * Set of callbacks to execute when all subscribers have unsubscribed
	 *
	 * @private
	 * @type {Set<() => void>}
	 */
	private _onAllUnsubscribeCallbacks: Set<() => void> = new Set();

	/**
	 * Registers a callback to execute when all subscribers have unsubscribed
	 *
	 * @param {() => void} _callback - Function to call when all subscribers are removed
	 * @returns {void}
	 * @example
	 * ```typescript
	 * store.onAllUnsubscribe(() => {
	 *   console.log('All subscribers removed - cleaning up resources');
	 * });
	 * ```
	 */
	onAllUnsubscribe(_callback: () => void): void {
		this._onAllUnsubscribeCallbacks.add(_callback);
	}
}

/**
 * Writable array store that extends WritableBase with array-specific operations.
 * Provides reactive array manipulation with filtering, sorting, and standard array methods.
 *
 * @export
 * @class WritableArray
 * @typedef {WritableArray}
 * @template T - The type of elements in the array
 * @extends {WritableBase<T[]>}
 */
export class WritableArray<T> extends WritableBase<T[]> {
	/**
	 * Creates a WritableArray from any iterable
	 *
	 * @static
	 * @template T
	 * @param {Iterable<T>} arr - Iterable to convert to WritableArray
	 * @returns {WritableArray<T>} New WritableArray instance
	 * @example
	 * ```typescript
	 * const store = WritableArray.from([1, 2, 3]);
	 * const fromSet = WritableArray.from(new Set(['a', 'b', 'c']));
	 * ```
	 */
	static from<T>(arr: Iterable<T>): WritableArray<T> {
		return new WritableArray(Array.from(arr));
	}

	/**
	 * Gets the current length of the array
	 *
	 * @returns {number} Number of elements in the array
	 */
	get length() {
		return this.data.length;
	}

	/**
	 * Adds an item to the end of the array and notifies subscribers
	 *
	 * @param {T} item - Item to add to the array
	 * @returns {void}
	 */
	push(item: T): void {
		this.update((arr) => {
			arr.push(item);
			return arr;
		});
	}

	/**
	 * Removes and returns the last item from the array
	 *
	 * @returns {T | undefined} The removed item, or undefined if array is empty
	 */
	pop(): T | undefined {
		let poppedItem: T | undefined;
		this.update((arr) => {
			poppedItem = arr.pop();
			return arr;
		});
		return poppedItem;
	}

	/**
	 * Removes and returns the first item from the array
	 *
	 * @returns {T | undefined} The removed item, or undefined if array is empty
	 */
	shift(): T | undefined {
		let shiftedItem: T | undefined;
		this.update((arr) => {
			shiftedItem = arr.shift();
			return arr;
		});
		return shiftedItem;
	}

	/**
	 * Adds an item to the beginning of the array and notifies subscribers
	 *
	 * @param {T} item - Item to add to the beginning of the array
	 * @returns {void}
	 */
	unshift(item: T): void {
		this.update((arr) => {
			arr.unshift(item);
			return arr;
		});
	}

	/**
	 * Changes the contents of the array by removing/replacing existing elements and/or adding new elements
	 *
	 * @param {number} start - Index at which to start changing the array
	 * @param {number} deleteCount - Number of elements to remove
	 * @param {...T[]} items - Elements to add to the array
	 * @returns {void}
	 */
	splice(start: number, deleteCount: number, ...items: T[]): void {
		this.update((arr) => {
			arr.splice(start, deleteCount, ...items);
			return arr;
		});
	}

	/**
	 * Removes all elements from the array
	 *
	 * @returns {void}
	 */
	clear(): void {
		this.set([]);
	}

	/**
	 * Internal sort function (no-op by default)
	 *
	 * @private
	 * @type {(a: T, b: T) => number}
	 */
	_sort = (_a: T, _b: T): number => 0;

	/**
	 * Internal filter function (passes all by default)
	 *
	 * @private
	 * @type {(item: T) => boolean}
	 */
	_filter = (_item: T): boolean => true;

	/**
	 * Internal reverse flag
	 *
	 * @private
	 * @type {boolean}
	 */
	_reverse = false;

	/**
	 * Toggles the reverse order of the array display
	 *
	 * @returns {void}
	 */
	reverse(): void {
		this._reverse = !this._reverse;
		this.inform();
	}

	/**
	 * Sets the sort function for the array display
	 *
	 * @param {(a: T, b: T) => number} fn - Comparison function for sorting
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Sort numbers ascending
	 * store.sort((a, b) => a - b);
	 * ```
	 */
	sort(fn: (a: T, b: T) => number): void {
		this._sort = fn;
		this.inform();
	}

	/**
	 * Sets the filter function for the array display
	 *
	 * @param {(item: T) => boolean} fn - Predicate function for filtering
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Only show even numbers
	 * store.filter(n => n % 2 === 0);
	 * ```
	 */
	filter(fn: (item: T) => boolean): void {
		this._filter = fn;
		this.inform();
	}

	/**
	 * Notifies subscribers with filtered, sorted, and optionally reversed data
	 *
	 * @returns {void}
	 */
	inform(): void {
		const sortedAndFiltered = this.data.filter(this._filter).sort(this._sort);

		if (this._reverse) {
			sortedAndFiltered.reverse();
		}

		for (const subscriber of this.subscribers) {
			subscriber(sortedAndFiltered);
		}
	}

	/**
	 * Creates a new WritableArray with the results of calling a function on every element
	 * Note: Filter, sort, and reverse settings are copied to the new array
	 *
	 * @template U
	 * @param {(item: T) => U} fn - Function that transforms each element
	 * @returns {WritableArray<U>} New WritableArray with transformed elements
	 * @example
	 * ```typescript
	 * const numbers = new WritableArray([1, 2, 3]);
	 * const strings = numbers.map(n => n.toString());
	 * ```
	 */
	map<U>(fn: (item: T) => U) {
		const mapped = new WritableArray<U>(this.data.map(fn));
		// Copy filter, sort, and reverse settings
		(mapped as any)._filter = this._filter as any;
		(mapped as any)._sort = this._sort as any;
		(mapped as any)._reverse = this._reverse;
		return mapped;
	}

	/**
	 * Executes a provided function once for each array element
	 *
	 * @param {(item: T, index: number, arr: T[]) => void} fn - Function to execute for each element
	 * @returns {void}
	 */
	each(fn: (item: T, index: number, arr: T[]) => void): void {
		for (let i = 0; i < this.data.length; i++) {
			fn(this.data[i], i, this.data);
		}
	}

	/**
	 * Removes the first occurrence of the specified item from the array
	 *
	 * @param {T} item - Item to remove from the array
	 * @returns {void}
	 */
	remove(item: T): void {
		this.update((arr) => {
			const index = arr.indexOf(item);
			if (index !== -1) {
				arr.splice(index, 1);
			}
			return arr;
		});
	}
}
