/**
 * @fileoverview Writable store helpers with debouncing and utilities.
 *
 * @example
 * import { WritableBase } from '$lib/services/writables';
 * const store = new WritableBase(0);
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Subscriber, Unsubscriber, Writable } from 'svelte/store';
import { attempt, attemptAsync, debounce, ResultPromise } from 'ts-utils';
import deepEqual from 'fast-deep-equal';

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
	 * @param {boolean} [_config.debug=false] - Enable debug logging
	 */
	constructor(
		private _data: T,
		private _config?: {
			debounceMs?: number;
			debug?: boolean;
		}
	) {
		this._informDebounced = debounce(() => {
			this._informImmediate();
		}, this._config?.debounceMs ?? 0);

		if (this._config?.debug) {
			this.log('Initialized with data:', this._data);
			this.subscribe((val) => {
				this.log('Updated data to:', val);
			});
		}
	}

	get data(): T {
		return this._data;
	}

	set data(value: T) {
		for (const interceptor of this.interceptors) {
			this.log('Intercepting value:', value);
			value = interceptor(value);
			this.log('Value after interception:', value);
		}
		for (const validator of this.validators) {
			if (!validator(value)) {
				this.log('Validation failed for value:', value);
				return;
			} else {
				this.log('Validation passed for value:', value);
			}
		}
		this._data = value;
		this.inform();
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
					this.destroy();
				}
			}
			// if we are in debug mode, it starts with 1 subscriber, so it's ready to be destroyed.
			if (this.subscribers.size === 1 && this._config?.debug) {
				this.log('Last subscriber removed');
				for (const callback of this._onAllUnsubscribeCallbacks) {
					callback();
					this.destroy();
				}
				this.subscribers.clear();
			}
		};
	}

	/**
	 * Subscribes once and auto-unsubscribes after the first emission.
	 * This does not emit the current value immediately.
	 *
	 * @param {Subscriber<T>} run - Callback invoked on the first emission
	 * @returns {Unsubscriber} Function to cancel the one-time subscription
	 * @example
	 * ```typescript
	 * const store = new WritableBase(0);
	 * store.subscribeOnce(value => console.log(value));
	 * store.set(1); // logs 1
	 * ```
	 */
	subscribeOnce(run: Subscriber<T>): Unsubscriber {
		const wrapper: Subscriber<T> = (value) => {
			run(value);
			this.subscribers.delete(wrapper);
		};

		this.subscribers.add(wrapper);
		return () => {
			this.subscribers.delete(wrapper);
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
	 * @example
	 * ```typescript
	 * const store = new WritableBase(0, { debounceMs: 100 });
	 * store.inform(true); // notify immediately
	 * ```
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
	 * @param {() => void} cb - Function to call when all subscribers are removed
	 * @returns {void}
	 * @example
	 * ```typescript
	 * store.onAllUnsubscribe(() => {
	 *   console.log('All subscribers removed - cleaning up resources');
	 * });
	 * ```
	 */
	onAllUnsubscribe(cb: () => void): void {
		this._onAllUnsubscribeCallbacks.add(cb);
	}

	/**
	 * Pipes updates from the target writable into this writable
	 * Once piped, this writable will receive updates from the target
	 * Once this writable has no subscribers, the pipe subscription will be unsubscribed
	 * @param {Writable<unknown>} target - The writable store to pipe from
	 */
	pipe(target: Writable<unknown>): void {
		this.onAllUnsubscribe(target.subscribe(() => this.inform()));
	}

	/**
	 * Pipes updates from the target writable into this writable, transforming the data with the provided function
	 * Once piped, this writable will receive transformed updates from the target
	 * Once this writable has no subscribers, the pipe subscription will be unsubscribed
	 * @param target - The writable store to pipe from
	 * @param transform - Function that transforms the target's data into the type of this writable
	 * @example
	 * ```typescript
	 * const source = new WritableBase(0);
	 * const target = new WritableBase('');
	 * target.pipeData(source, num => `Number is: ${num}`);
	 * source.set(42); // target will update to "Number is: 42"
	 * ```
	 */
	pipeData<Target>(target: Writable<Target>, transform: (data: Target) => T): void {
		this.onAllUnsubscribe(
			target.subscribe((data) => {
				this.data = transform(data);
			})
		);
	}

	/**
	 * Awaits the next update to the writable, with an optional timeout to prevent hanging indefinitely. This will default to a 10 second timeout if not specified.
	 * @param timeout - Maximum time to wait in milliseconds (default: 10 seconds)
	 * @returns {ResultPromise<T>} ResultPromise that resolves with the next data value or rejects on timeout
	 */
	await(timeout = 10 * 1000): ResultPromise<T> {
		return attemptAsync<T>(async () => {
			return new Promise<T>((resolve, reject) => {
				const unsub = this.subscribeOnce((data) => {
					resolve(data);
					unsub();
					clearTimeout(t);
				});
				const t = setTimeout(() => {
					reject(new Error('WritableBase.await timed out'));
					unsub();
				}, timeout);
			});
		});
	}

	private readonly interceptors = new Set<(value: T) => T>();

	/**
	 * Adds an interceptor function that modifies values before they are set
	 * @param fn - Interceptor function that receives the value and returns the modified value
	 * @example
	 * ```typescript
	 * const store = new WritableBase(0);
	 * store.intercept(v => v + 1);
	 * store.set(1); // stored as 2
	 * ```
	 */
	intercept(fn: (value: T) => T) {
		this.interceptors.add(fn);
		return () => this.interceptors.delete(fn);
	}

	private readonly validators = new Set<(value: T) => boolean>();

	/**
	 * Adds a validator function that checks values before they are set
	 * @param fn - Validator function that receives the value and returns true if valid, false otherwise
	 * @example
	 * ```typescript
	 * const store = new WritableBase(0);
	 * store.addValidator(v => v >= 0);
	 * store.set(-1); // ignored
	 * ```
	 */
	addValidator(fn: (value: T) => boolean): void {
		this.validators.add(fn);
	}

	private log(...args: unknown[]): void {
		if (this._config?.debug) {
			console.log('[WritableBase]', ...args);
		}
	}

	/**
	 * Destroys the writable by clearing all subscribers, interceptors, validators, and onAllUnsubscribe callbacks. This is useful for cleaning up resources when the writable is no longer needed.
	 * In debug mode, this will be automatically called when the last subscriber unsubscribes.
	 * @returns {void}
	 * @example
	 * ```typescript
	 * const store = new WritableBase('data', { debug: true });
	 * const unsubscribe = store.subscribe(() => {});
	 * unsubscribe(); // Logs "Last subscriber removed" and calls onAllUnsubscribe callbacks
	 * ```
	 */
	destroy() {
		this.subscribers.clear();
		this.interceptors.clear();
		this.validators.clear();
		this._onAllUnsubscribeCallbacks.clear();
	}

	/**
	 * Compares this WritableBase to another for equality based on current data. Note that config, subscribers, interceptors, validators, and onAllUnsubscribe callbacks are not considered in the equality check.
	 * @param other - Another WritableBase instance to compare against
	 * @returns {boolean} True if the other WritableBase has the same data, false otherwise
	 * @example
	 * ```typescript
	 * const storeA = new WritableBase(1);
	 * const storeB = new WritableBase(1);
	 * const storeC = new WritableBase(2);
	 * console.log(storeA.equals(storeB)); // true
	 * console.log(storeA.equals(storeC)); // false
	 * ```
	 */
	equals(other: WritableBase<T>): boolean {
		return deepEqual(this.data, other.data);
	}

	/**
	 * Creates a new WritableBase that derives its value from this WritableBase using the provided transform function. The derived WritableBase will automatically update whenever this WritableBase changes, applying the transform function to produce the new value.
	 * @param transform - Function that transforms this WritableBase's data into the type of the derived WritableBase
	 * @param config - Optional configuration for the derived WritableBase (debounceMs and debug)
	 * @returns {WritableBase<U>} A new WritableBase instance that derives its value from this one
	 * @example
	 * ```typescript
	 * const store = new WritableBase(1);
	 * const derived = store.derive(num => `Number is: ${num}`);
	 * store.set(2); // derived will update to "Number is: 2"
	 * ```
	 */
	derive<U>(
		transform: (data: T) => U,
		config?: { debounceMs?: number; debug?: boolean }
	): WritableBase<U> {
		const derived = new WritableBase<U>(transform(this.data), config);
		derived.pipeData(this, transform);
		return derived;
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
	reverse() {
		this._reverse = !this._reverse;
		this.inform();
		return this;
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
	sort(fn: (a: T, b: T) => number) {
		this._sort = fn;
		this.inform();
		return this;
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
	filter(fn: (item: T) => boolean) {
		this._filter = fn;
		this.inform();
		return this;
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
	 * By default, the new array will reactively update when the original array changes. You can disable this by passing `false` as the second argument.
	 *
	 * @template U
	 * @param {(item: T) => U} fn - Function that transforms each element
	 * @param {object} [config] - Optional configuration for the mapped array
	 * @param {boolean} [config.reactive=true] - If true, the mapped array will update reactively when the original array changes
	 * @param {boolean} [config.interceptors=true] - If true, interceptors will be copied to the mapped array
	 * @param {boolean} [config.validators=true] - If true, validators will be copied to the mapped array
	 * @returns {WritableArray<U>} New WritableArray with transformed elements
	 * @example
	 * ```typescript
	 * const numbers = new WritableArray([1, 2, 3]);
	 * const strings = numbers.map(n => n.toString());
	 * ```
	 */
	map<U>(fn: (item: T) => U, reactive = true) {
		const mapped = new WritableArray<U>(this.data.map(fn));
		// Copy filter, sort, and reverse settings
		(mapped as any)._filter = this._filter as any;
		(mapped as any)._sort = this._sort as any;
		(mapped as any)._reverse = this._reverse;

		if (reactive) {
			mapped.pipeData(this, (arr) => arr.map(fn));
		}

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
	 * Applies a function against an accumulator and each element in the array to reduce it to a single value. The resulting WritableBase will reactively update when the original array changes.
	 * @param fn - Reducer function that takes an accumulator, current item, index, and the array, and returns the new accumulator value
	 * @param initialValue - Initial value for the reduction
	 * @returns {WritableBase<U>} A new WritableBase that holds the reduced value
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2, 3]);
	 * const sum = store.reduce((acc, item) => acc + item, 0);
	 * store.subscribe(() => {
	 *  console.log("Total:", sum.data); // logs the sum of the array whenever it changes
	 * });
	 * ```
	 */
	reduce<U>(fn: (acc: U, item: T, index: number, arr: T[]) => U, initialValue: U): WritableBase<U> {
		const reduced = new WritableBase<U>(initialValue);
		reduced.pipeData(this, (arr) => arr.reduce(fn, initialValue));
		return reduced;
	}

	/**
	 * Removes items from the array based on a predicate function
	 * @param fn - Predicate function to determine which items to remove
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Remove items matching a condition
	 * store.remove(item => item.id === targetId);
	 * ```
	 */
	remove(fn: (item: T) => boolean): void;
	/**
	 * Removes specific items from the array
	 * @param items - The items to remove
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Remove a specific item
	 * store.remove(targetItem);
	 * // Remove multiple items
	 * store.remove(item1, item2, item3);
	 * ```
	 */
	remove(...items: T[]): void;
	/**
	 * Removes items from the array based on a predicate function or specific items
	 * @param items - Predicate function or specific items to remove
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Remove items matching a condition
	 * store.remove(item => item.id === targetId);
	 *
	 * // Remove specific items
	 * store.remove(targetItem);
	 * store.remove(item1, item2, item3);
	 * ```
	 */
	remove(...items: (T | ((item: T) => boolean))[]): void {
		// If first argument is a function, treat it as a predicate
		if (items.length === 1 && typeof items[0] === 'function') {
			const predicate = items[0] as (item: T) => boolean;
			this.update((arr) => {
				return arr.filter((i) => !predicate(i));
			});
			return;
		}

		// Otherwise, remove all specified items
		this.update((arr) => {
			return arr.filter((item) => !(items as T[]).includes(item));
		});
	}

	/**
	 * Creates a snapshot of the current array data
	 * @returns {T[]} A new array containing the current data
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2]);
	 * const copy = store.snapshot();
	 * ```
	 */
	snapshot(): T[] {
		return [...this.data];
	}

	/**
	 * Sets the value at a specific index.
	 * Returns a Result that is ok on success, or error if the index is out of bounds.
	 *
	 * @param {number} index - Index to update
	 * @param {T} value - Value to assign
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	setAt(index: number, value: T) {
		return attempt(() => {
			if (this.data.length <= index) {
				throw new Error(`Index ${index} is out of bounds for array of length ${this.data.length}`);
			}
			this.update((arr) => {
				arr[index] = value;
				return arr;
			});
		});
	}

	/**
	 * Updates the value at a specific index using a transform function.
	 * Returns a Result that is ok on success, or error if the index is out of bounds.
	 *
	 * @param {number} index - Index to update
	 * @param {(value: T) => T} fn - Transform function applied to the existing value
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	updateAt(index: number, fn: (value: T) => T) {
		return attempt(() => {
			if (this.data.length <= index) {
				throw new Error(`Index ${index} is out of bounds for array of length ${this.data.length}`);
			}
			this.update((arr) => {
				arr[index] = fn(arr[index]);
				return arr;
			});
		});
	}

	/**
	 * Inserts a value at a specific index.
	 *
	 * @param {number} index - Index to insert at
	 * @param {T} value - Value to insert
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	insertAt(index: number, value: T) {
		return attempt(() => {
			this.update((arr) => {
				arr.splice(index, 0, value);
				return arr;
			});
		});
	}

	/**
	 * Removes the item at a specific index.
	 *
	 * @param {number} index - Index to remove
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	removeAt(index: number) {
		return attempt(() => {
			this.update((arr) => {
				arr.splice(index, 1);
				return arr;
			});
		});
	}

	/**
	 * Swaps two indices in the array.
	 * Returns a Result that is ok on success, or error if either index is out of bounds.
	 *
	 * @param {number} indexA - First index
	 * @param {number} indexB - Second index
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	swap(indexA: number, indexB: number) {
		return attempt(() => {
			if (this.data.length <= indexA || this.data.length <= indexB) {
				throw new Error(
					`Index ${indexA} or ${indexB} is out of bounds for array of length ${this.data.length}`
				);
			}
			this.update((arr) => {
				const temp = arr[indexA];
				arr[indexA] = arr[indexB];
				arr[indexB] = temp;
				return arr;
			});
		});
	}

	/**
	 * Moves an item from one index to another.
	 * Returns a Result that is ok on success, or error if either index is out of bounds.
	 *
	 * @param {number} fromIndex - Source index
	 * @param {number} toIndex - Destination index
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	move(fromIndex: number, toIndex: number) {
		return attempt(() => {
			if (this.data.length <= fromIndex || this.data.length <= toIndex) {
				throw new Error(
					`Index ${fromIndex} or ${toIndex} is out of bounds for array of length ${this.data.length}`
				);
			}
			this.update((arr) => {
				const [item] = arr.splice(fromIndex, 1);
				arr.splice(toIndex, 0, item);
				return arr;
			});
		});
	}

	/**
	 * Replaces the value at a specific index.
	 * Returns a Result that is ok on success, or error if the index is out of bounds.
	 *
	 * @param {number} index - Index to replace
	 * @param {T} value - New value
	 * @returns {import('ts-utils').Result<unknown, Error>} Result of the operation
	 */
	replace(index: number, value: T) {
		return attempt(() => {
			if (this.data.length <= index) {
				throw new Error(`Index ${index} is out of bounds for array of length ${this.data.length}`);
			}
			this.update((arr) => {
				arr[index] = value;
				return arr;
			});
		});
	}

	/**
	 * Finds the index of an item by predicate.
	 * When reactive is true, returns a WritableBase that updates as the array changes.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Finds the index of an item by predicate and returns a reactive store.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<number>} Reactive index store
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2, 3]);
	 * const idx = store.findIndex(v => v === 3, true);
	 * idx.subscribe(console.log); // emits 2
	 * ```
	 */
	findIndex(fn: (value: T) => boolean, reactive: true): WritableBase<number>;
	/**
	 * Finds the index of an item by predicate and returns the number immediately.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {false} reactive - Return the immediate index
	 * @returns {number} Index of the first matching item, or -1
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2, 3]);
	 * const idx = store.findIndex(v => v === 2, false);
	 * ```
	 */
	findIndex(fn: (value: T) => boolean, reactive: false): number;
	findIndex(fn: (value: T) => boolean, reactive: boolean): WritableBase<number> | number {
		if (!reactive) {
			return this.data.findIndex(fn);
		}
		const indexStore = new WritableBase(this.data.findIndex(fn));
		indexStore.pipeData(this, (arr) => arr.findIndex(fn));
		return indexStore;
	}

	/**
	 * Finds an item by predicate.
	 * When reactive is true, returns a WritableBase that updates as the array changes.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Finds an item by predicate and returns a reactive store.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<T | undefined>} Reactive item store
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2, 3]);
	 * const item = store.find(v => v === 2, true);
	 * item.subscribe(console.log); // emits 2
	 * ```
	 */
	find(fn: (value: T) => boolean, reactive: true): WritableBase<T | undefined>;
	/**
	 * Finds an item by predicate and returns the value immediately.
	 *
	 * @param {(value: T) => boolean} fn - Predicate function
	 * @param {false} reactive - Return the immediate value
	 * @returns {T | undefined} First matching item, or undefined
	 * @example
	 * ```typescript
	 * const store = new WritableArray([1, 2, 3]);
	 * const item = store.find(v => v === 2, false);
	 * ```
	 */
	find(fn: (value: T) => boolean, reactive: false): T | undefined;
	find(fn: (value: T) => boolean, reactive: boolean): WritableBase<T | undefined> | T | undefined {
		if (!reactive) {
			return this.data.find(fn);
		}
		const itemStore = new WritableBase(this.data.find(fn));
		itemStore.pipeData(this, (arr) => arr.find(fn));
		return itemStore;
	}

	/**
	 * Converts the array to a Set.
	 * When reactive is true, returns a WritableBase that updates as the array changes.
	 *
	 * @param {boolean} [reactive=true] - Whether to keep the set reactive
	 * @returns {WritableBase<Set<T>>} Set store
	 */
	toSet(reactive = true): WritableBase<Set<T>> {
		const setStore = new WritableBase(new Set(this.data));
		if (reactive) setStore.pipeData(this, (arr) => new Set(arr));
		return setStore;
	}

	/**
	 * Returns a new array containing unique items based on a key selector.
	 * When reactive is true, the resulting array updates as the source changes.
	 *
	 * @param {(value: T) => unknown} fn - Key selector
	 * @param {boolean} [reactive=true] - Whether to keep the result reactive
	 * @returns {WritableArray<T>} Unique array store
	 */
	uniqueBy(fn: (value: T) => unknown, reactive = true): WritableArray<T> {
		const uniqueStore = new WritableArray<T>([]);
		if (reactive) {
			uniqueStore.pipeData(this, (arr) => {
				const seen = new Set();
				return arr.filter((item) => {
					const key = fn(item);
					if (seen.has(key)) {
						return false;
					} else {
						seen.add(key);
						return true;
					}
				});
			});
		}
		return uniqueStore;
	}
}

/**
 * Writable set store with reactive Set operations.
 *
 * @export
 * @class WritableSet
 * @template T
 * @extends {WritableBase<Set<T>>}
 */
export class WritableSet<T> extends WritableBase<Set<T>> {
	/**
	 * Adds an item to the set and notifies subscribers.
	 *
	 * @param {T} item - Item to add
	 * @returns {void}
	 * @example
	 * ```typescript
	 * const set = new WritableSet(new Set());
	 * set.add('a');
	 * ```
	 */
	add(item: T): void {
		this.update((set) => {
			set.add(item);
			return set;
		});
	}

	/**
	 * Deletes an item from the set and notifies subscribers.
	 *
	 * @param {T} item - Item to delete
	 * @returns {void}
	 */
	delete(item: T): void {
		this.update((set) => {
			set.delete(item);
			return set;
		});
	}

	/**
	 * Checks whether the set has an item.
	 * When reactive is true, returns a WritableBase that updates as the set changes.
	 *
	 * @param {T} item - Item to check
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Checks whether the set has an item and returns a boolean immediately.
	 *
	 * @param {T} item - Item to check
	 * @param {false} reactive - Return the immediate boolean
	 * @returns {boolean} Whether the set currently contains the item
	 * @example
	 * ```typescript
	 * const set = new WritableSet(new Set([1]));
	 * const hasOne = set.has(1, false);
	 * ```
	 */

	has(item: T, reactive: false): boolean;
	/**
	 * Checks whether the set has an item and returns a reactive store.
	 *
	 * @param {T} item - Item to check
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<boolean>} Reactive boolean store
	 * @example
	 * ```typescript
	 * const set = new WritableSet(new Set([1]));
	 * const hasOne = set.has(1, true);
	 * hasOne.subscribe(console.log);
	 * ```
	 */

	has(item: T, reactive: true): WritableBase<boolean>;
	has(item: T, reactive: boolean): WritableBase<boolean> | boolean {
		if (!reactive) {
			return this.data.has(item);
		}
		const hasStore = new WritableBase(this.data.has(item));
		hasStore.pipeData(this, (set) => set.has(item));
		return hasStore;
	}

	/**
	 * Clears the set and notifies subscribers.
	 *
	 * @returns {void}
	 */
	clear(): void {
		this.data.clear();
		this.inform();
	}
}

/**
 * Writable map store with reactive Map operations.
 *
 * @export
 * @class WritableMap
 * @template K, V
 * @extends {WritableBase<Map<K, V>>}
 */
export class WritableMap<K, V> extends WritableBase<Map<K, V>> {
	/**
	 * Sets a key/value pair and notifies subscribers.
	 *
	 * @param {K} key - Map key
	 * @param {V} value - Map value
	 * @returns {void}
	 * @example
	 * ```typescript
	 * const map = new WritableMap(new Map());
	 * map.setKeyValue('a', 1);
	 * ```
	 */
	setKeyValue(key: K, value: V): void {
		this.update((map) => {
			map.set(key, value);
			return map;
		});
	}

	/**
	 * Deletes a key from the map and notifies subscribers.
	 *
	 * @param {K} key - Map key to delete
	 * @returns {void}
	 */
	delete(key: K): void {
		this.update((map) => {
			map.delete(key);
			return map;
		});
	}

	/**
	 * Checks whether the map has a key.
	 * When reactive is true, returns a WritableBase that updates as the map changes.
	 *
	 * @param {K} key - Map key to check
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Checks whether the map has a key and returns a boolean immediately.
	 *
	 * @param {K} key - Map key to check
	 * @param {false} reactive - Return the immediate boolean
	 * @returns {boolean} Whether the map currently contains the key
	 * @example
	 * ```typescript
	 * const map = new WritableMap(new Map([['a', 1]]));
	 * const hasA = map.has('a', false);
	 * ```
	 */

	has(key: K, reactive: false): boolean;
	/**
	 * Checks whether the map has a key and returns a reactive store.
	 *
	 * @param {K} key - Map key to check
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<boolean>} Reactive boolean store
	 * @example
	 * ```typescript
	 * const map = new WritableMap(new Map([['a', 1]]));
	 * const hasA = map.has('a', true);
	 * hasA.subscribe(console.log);
	 * ```
	 */

	has(key: K, reactive: true): WritableBase<boolean>;
	has(key: K, reactive: boolean): WritableBase<boolean> | boolean {
		if (!reactive) {
			return this.data.has(key);
		}
		const hasStore = new WritableBase(this.data.has(key));
		hasStore.pipeData(this, (map) => map.has(key));
		return hasStore;
	}

	/**
	 * Clears the map and notifies subscribers.
	 *
	 * @returns {void}
	 */
	clear(): void {
		this.data.clear();
		this.inform();
	}
}

/**
 * Writable async store with status/data/error tracking for promise lifecycles.
 *
 * @export
 * @class WritableAsync
 * @template T
 * @extends {WritableBase<{ status: 'idle' | 'pending' | 'fulfilled' | 'rejected'; data?: T; error?: unknown; promise?: Promise<T>; }>}
 */
export class WritableAsync<T> extends WritableBase<{
	status: 'idle' | 'pending' | 'fulfilled' | 'rejected';
	data?: T;
	error?: unknown;
	promise?: Promise<T>;
}> {
	/**
	 * Runs a promise-producing function and updates status/data/error accordingly.
	 *
	 * @param {() => Promise<T>} promiseFn - Function returning the promise to track
	 * @returns {void}
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * asyncStore.run(async () => 42);
	 * ```
	 */
	run(promiseFn: () => Promise<T>): void {
		this.set({ status: 'pending', promise: promiseFn() });
		this.data.promise
			?.then((data) => {
				this.set({ status: 'fulfilled', data });
			})
			.catch((error) => {
				this.set({ status: 'rejected', error });
			});
	}

	/**
	 * Resets the async state to idle and drops any pending promise reference.
	 *
	 * @returns {void}
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * asyncStore.reset();
	 * ```
	 */
	reset(): void {
		Promise.reject(this.data.promise).catch(() => {
			/* Ignore unhandled rejection from resetting while pending */
		});
		this.set({ status: 'idle' });
		this.data.promise = undefined;
	}

	/**
	 * Returns the current status, or a reactive store when requested.
	 *
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Returns the current status immediately.
	 *
	 * @param {false} reactive - Return the immediate status
	 * @returns {'idle' | 'pending' | 'fulfilled' | 'rejected'} Current status
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync({ status: 'idle' });
	 * const status = asyncStore.status(false);
	 * ```
	 */

	status(reactive: false): 'idle' | 'pending' | 'fulfilled' | 'rejected';
	/**
	 * Returns a reactive store for status updates.
	 *
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<'idle' | 'pending' | 'fulfilled' | 'rejected'>} Status store
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync({ status: 'idle' });
	 * const status = asyncStore.status(true);
	 * status.subscribe(console.log);
	 * ```
	 */

	status(reactive: true): WritableBase<'idle' | 'pending' | 'fulfilled' | 'rejected'>;
	status(
		reactive: boolean
	):
		| WritableBase<'idle' | 'pending' | 'fulfilled' | 'rejected'>
		| 'idle'
		| 'pending'
		| 'fulfilled'
		| 'rejected' {
		if (!reactive) {
			return this.data.status;
		}
		const statusStore = new WritableBase(this.data.status);
		statusStore.pipeData(this, (state) => state.status);
		return statusStore;
	}

	/**
	 * Returns the current data, or a reactive store when requested.
	 *
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Returns the current result immediately.
	 *
	 * @param {false} reactive - Return the immediate value
	 * @returns {T | undefined} Current data value
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * const value = asyncStore.result(false);
	 * ```
	 */

	result(reactive: false): T | undefined;
	/**
	 * Returns a reactive store for result updates.
	 *
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<T | undefined>} Result store
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * const value = asyncStore.result(true);
	 * value.subscribe(console.log);
	 * ```
	 */

	result(reactive: true): WritableBase<T | undefined>;
	result(reactive: boolean): WritableBase<T | undefined> | T | undefined {
		if (!reactive) {
			return this.data.data;
		}
		const dataStore = new WritableBase(this.data.data);
		dataStore.pipeData(this, (state) => state.data);
		return dataStore;
	}

	/**
	 * Returns the current error, or a reactive store when requested.
	 *
	 * @param {boolean} reactive - Whether to return a reactive store
	 */
	/**
	 * Returns the current error immediately.
	 *
	 * @param {false} reactive - Return the immediate error value
	 * @returns {unknown} Current error
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * const error = asyncStore.error(false);
	 * ```
	 */

	error(reactive: false): unknown;
	/**
	 * Returns a reactive store for error updates.
	 *
	 * @param {true} reactive - Return a reactive store
	 * @returns {WritableBase<unknown>} Error store
	 * @example
	 * ```typescript
	 * const asyncStore = new WritableAsync<number>({ status: 'idle' });
	 * const error = asyncStore.error(true);
	 * error.subscribe(console.log);
	 * ```
	 */

	error(reactive: true): WritableBase<unknown>;
	error(reactive: boolean): WritableBase<unknown> | unknown {
		if (!reactive) {
			return this.data.error;
		}
		const errorStore = new WritableBase(this.data.error);
		errorStore.pipeData(this, (state) => state.error);
		return errorStore;
	}
}
