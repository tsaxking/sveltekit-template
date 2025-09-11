import { Struct, type Blank } from './index';
import { type Writable } from 'svelte/store';
import { StructData } from './struct-data';

/**
 * Svelte store data array, used to store multiple data points and automatically update the view
 *
 * @export
 * @class DataArr
 * @typedef {DataArr}
 * @template {Blank} T
 * @implements {Readable<StructData<T>[]>}
 */
export class DataArr<T extends Blank> implements Writable<StructData<T>[]> {
	/**
	 * A set of StructData objects that this DataArr holds.
	 *
	 * @private
	 * @readonly
	 * @type {Set<StructData<T>>}
	 */
	private readonly dataset: Set<StructData<T>>;

	/**
	 * Creates an instance of DataArr.
	 *
	 * @constructor
	 * @param {Struct<T>} struct
	 * @param {StructData<T>[]} data
	 */
	constructor(
		public readonly struct: Struct<T>,
		data: StructData<T>[]
	) {
		this.dataset = new Set(data);
	}

	/**
	 * All subscribers to the data array
	 *
	 * @private
	 * @type {*}
	 */
	private readonly subscribers = new Set<(value: StructData<T>[]) => void>();

	/**
	 * Retrieves all data points in the array.
	 *
	 * @public
	 * @type {{}}
	 */
	public get data() {
		return Array.from(this.dataset);
	}

	/**
	 * Sets the data array to a new value, clearing the existing dataset and adding the new values.
	 *
	 * @public
	 * @type {{}}
	 */
	public set data(value: StructData<T>[]) {
		this.dataset.clear();
		for (let i = 0; i < value.length; i++) {
			this.dataset.add(value[i]);
		}
		this.inform();
	}

	/**
	 * Subscribe to the data array
	 *
	 * @public
	 * @param {(value: StructData<T>[]) => void} fn
	 * @returns {() => void}
	 */
	public subscribe(fn: (value: StructData<T>[]) => void): () => void {
		this.subscribers.add(fn);
		fn(this.data);
		return () => {
			this.subscribers.delete(fn);
			if (this.subscribers.size === 0) {
				this._onAllUnsubscribe?.();
			}
		};
	}

	/**
	 * Applies the new state to the data array and updates the subscribers
	 *
	 * @private
	 * @param {StructData<T>[]} value
	 */
	private apply(value: StructData<T>[]): void {
		this.data = value.sort(this._sort).filter(this._filter);
		this.struct.log('Applied Data:', this.data);
		this.inform();
	}

	/**
	 * Adds data to the array and updates the subscribers
	 *
	 * @public
	 * @param {...StructData<T>[]} values
	 */
	public add(...values: StructData<T>[]): void {
		this.apply([...this.data, ...values]);
	}

	/**
	 *Removes data from the array and updates the subscribers
	 *
	 * @public
	 * @param {...StructData<T>[]} values
	 */
	public remove(...values: StructData<T>[]): void {
		this.apply(this.data.filter((value) => !values.includes(value)));
	}

	/**
	 * Runs when all subscribers have been removed
	 *
	 * @private
	 * @type {(() => void) | undefined}
	 */
	private _onAllUnsubscribe: (() => void) | undefined;
	/**
	 * Add listener for when all subscribers have been removed
	 *
	 * @public
	 * @param {() => void} fn
	 */
	public onAllUnsubscribe(fn: () => void): void {
		this._onAllUnsubscribe = fn;
	}

	/**
	 * Sorts the data array using a custom sorting function.
	 *
	 * @param {StructData<T>} a
	 * @param {StructData<T>} b
	 * @returns {number}
	 */
	private _sort: (a: StructData<T>, b: StructData<T>) => number = (_a, _b) => 0;

	/**
	 * Sets a custom sorting function for the data array.
	 *
	 * @param {(a: StructData<T>, b: StructData<T>) => number} fn
	 * @returns {number) => void}
	 */
	sort(fn: (a: StructData<T>, b: StructData<T>) => number) {
		this._sort = fn;
		this.inform();
	}

	/**
	 * Filters the data array using a custom filtering function.
	 *
	 * @returns {true}
	 */
	private _filter: (data: StructData<T>) => boolean = () => true;

	/**
	 * Sets a custom filtering function for the data array.
	 *
	 * @param {(data: StructData<T>) => boolean} fn
	 * @returns {boolean) => void}
	 */
	filter(fn: (data: StructData<T>) => boolean) {
		this._filter = fn;
		this.inform();
	}

	/**
	 * Informs the array to emit updates without any local changes
	 */
	inform() {
		this.subscribers.forEach((s) => s(this.data));
	}

	/**
	 * Sets the data array to a new value and updates the subscribers.
	 *
	 * @public
	 * @param {StructData<T>[]} value
	 */
	public set(value: StructData<T>[]) {
		this.apply(value);
	}

	/**
	 * Updates the data array using a function that receives the current data.
	 *
	 * @public
	 * @param {(data: StructData<T>[]) => StructData<T>[]} fn
	 * @returns {{}) => void}
	 */
	public update(fn: (data: StructData<T>[]) => StructData<T>[]) {
		this.apply(fn(this.data));
	}
}
