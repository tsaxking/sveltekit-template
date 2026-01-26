import { Struct, type Blank } from './index';
import { get, writable, type Writable } from 'svelte/store';
import { StructData } from './struct-data';
import { EventEmitter } from 'ts-utils/event-emitter';
import { WritableArray } from '$lib/utils/writables';
import { debounce } from 'ts-utils';

/**
 * Svelte store data array, used to store multiple data points and automatically update the view
 *
 * @export
 * @class DataArr
 * @typedef {DataArr}
 * @template {Blank} T
 * @implements {Readable<StructData<T>[]>}
 */
export class DataArr<T extends Blank> extends WritableArray<StructData<T>> {
	/**
	 * A set of StructData objects that this DataArr holds.
	 *
	 * @private
	 * @readonly
	 * @type {Set<StructData<T>>}
	 */
	private readonly dataset: Set<StructData<T>>;

	private readonly em = new EventEmitter<{
		add: StructData<T>[];
		remove: StructData<T>[];
	}>();

	public on = this.em.on.bind(this.em);
	public off = this.em.off.bind(this.em);
	private emit = this.em.emit.bind(this.em);
	public once = this.em.once.bind(this.em);

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
		super(data);
		this.dataset = new Set(data);
	}

	/**
	 * Applies the new state to the data array and updates the subscribers
	 *
	 * @private
	 * @param {StructData<T>[]} value
	 */
	private apply(value: StructData<T>[]): void {
		this.data = value.sort(this._sort).filter(this._filter);
		if (this._reverse) {
			this.data.reverse();
		}
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
		const current = [...this.data];
		this.apply([...this.data, ...values]);
		if (this.data.length > current.length) {
			this.emit('add', values);
		}
	}

	/**
	 * Removes data from the array based on a predicate function
	 * @param fn - Predicate function to determine which items to remove
	 */
	public remove(fn: (item: StructData<T>) => boolean): void;
	/**
	 * Removes specific data items from the array
	 * @param values - The items to remove
	 */
	public remove(...values: StructData<T>[]): void;
	/**
	 * Removes data from the array and updates the subscribers
	 *
	 * @public
	 * @param values - Predicate function or specific items to remove
	 */
	public remove(...values: (StructData<T> | ((item: StructData<T>) => boolean))[]): void {
		const current = [...this.data];

		// If first argument is a function, treat it as a predicate
		if (values.length === 1 && typeof values[0] === 'function') {
			const predicate = values[0] as (item: StructData<T>) => boolean;
			this.apply(
				this.data.filter((value) => {
					const p = !predicate(value);
					if (!p) {
						this.emit('remove', [value]);
					}
					return p;
				})
			);
		} else {
			// Otherwise, remove all specified items
			this.apply(this.data.filter((value) => !(values as StructData<T>[]).includes(value)));
			if (this.data.length < current.length) {
				this.emit('remove', values as StructData<T>[]);
			}
		}
	}

	private informImmediate() {
		this.subscribers.forEach((s) => s(this.data));
	}

	private informDebounced = debounce(() => {
		this.subscribers.forEach((s) => s(this.data));
	}, 50);

	/**
	 * Informs the array to emit updates without any local changes
	 */
	inform(immediate?: boolean) {
		if (immediate) {
			this.informImmediate();
		} else {
			this.informDebounced();
		}
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

	/**
	 * Clones the current DataArr instance.
	 * @returns {DataArr<T>} A new DataArr instance with the same struct and data.
	 */
	clone(): DataArr<T> {
		const d = new DataArr<T>(this.struct, this.data);
		d.filter(this._filter);
		d.sort(this._sort);
		if (this._reverse) {
			d.reverse();
		}
		return d;
	}
}

/**
 * Paginated extension of DataArr that provides pagination functionality for struct data.
 * Automatically handles data fetching, total count management, and page navigation.
 *
 * @export
 * @class PaginationDataArr
 * @typedef {PaginationDataArr}
 * @template {Blank} T - The struct type definition
 * @extends {DataArr<T>}
 */
export class PaginationDataArr<T extends Blank> extends DataArr<T> {
	/**
	 * Reactive store containing pagination information (page and pageSize)
	 *
	 * @public
	 * @readonly
	 * @type {Writable<{page: number, pageSize: number}>}
	 */
	public readonly info: Writable<{
		page: number;
		pageSize: number;
	}>;

	/**
	 * Reactive store containing the total number of records across all pages
	 *
	 * @public
	 * @readonly
	 * @type {Writable<number>}
	 */
	public readonly total = writable(0);

	/**
	 * Creates an instance of PaginationDataArr.
	 * Sets up automatic data fetching when pagination info changes and event handlers for data updates.
	 *
	 * @constructor
	 * @param {Struct<T>} struct - The parent struct instance
	 * @param {number} page - Initial page number (0-based)
	 * @param {number} pageSize - Number of items per page
	 * @param {(page: number, pageSize: number) => Promise<StructData<T>[]> | StructData<T>[]} getter - Function to fetch page data
	 * @param {() => Promise<number> | number} getTotal - Function to get total record count
	 */
	constructor(
		struct: Struct<T>,
		page: number,
		pageSize: number,
		getter: (page: number, pageSize: number) => Promise<StructData<T>[]> | StructData<T>[],
		getTotal: () => Promise<number> | number
	) {
		super(struct, []);
		this.info = writable({
			page,
			pageSize
		});

		const bouncedGetter = async (info: { page: number; pageSize: number }) => {
			const data = await getter(info.page, info.pageSize);
			this.set(data);
			this.total.set(await getTotal());
		};

		// Set up automatic data refresh when pagination info changes
		this.info.subscribe(async (info) => {
			bouncedGetter(info);
		});

		/**
		 * Handles data changes by refreshing current page and updating total count
		 *
		 * @param {number} num - Number to add to total count (+1 for add, -1 for remove)
		 */
		const onChange = async (num: number) => {
			const current = get(this.info);
			const newData = await getter(current.page, current.pageSize);
			this.data = newData;
			this.total.update((t) => t + num);
			this.inform();
		};

		// Set up event handlers for data changes
		this.on('add', () => onChange(1));
		this.on('remove', () => onChange(-1));

		this.inform();
	}

	/**
	 * Creates a clone of the current PaginationDataArr instance.
	 * Note: Uses static data from current instance rather than preserving original getter functions.
	 *
	 * @returns {PaginationDataArr<T>} A new PaginationDataArr instance with current data and settings
	 */
	clone(): PaginationDataArr<T> {
		const d = new PaginationDataArr<T>(
			this.struct,
			this.page,
			this.pageSize,
			async () => this.data,
			async () => this.data.length
		);
		d.filter(this['_filter']);
		d.sort(this['_sort']);
		if (this['_reverse']) {
			d.reverse();
		}
		return d;
	}

	/**
	 * Gets the current page size
	 *
	 * @returns {number} Current page size
	 */
	get pageSize() {
		return get(this.info).pageSize;
	}

	/**
	 * Sets the page size and triggers data refresh
	 *
	 * @param {number} size - New page size
	 */
	set pageSize(size: number) {
		this.info.update((i) => ({
			...i,
			pageSize: size
		}));
	}

	/**
	 * Gets the current page number (0-based)
	 *
	 * @returns {number} Current page number
	 */
	get page() {
		return get(this.info).page;
	}

	/**
	 * Sets the page number and triggers data refresh
	 *
	 * @param {number} page - New page number (0-based)
	 */
	set page(page: number) {
		this.info.update((i) => ({
			...i,
			page
		}));
	}

	/**
	 * Navigates to the next page if available
	 *
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Check if next page is available before calling
	 * const totalPages = Math.ceil(paginatedData.total / paginatedData.pageSize);
	 * if (paginatedData.page < totalPages - 1) {
	 *   paginatedData.next();
	 * }
	 * ```
	 */
	next() {
		const current = get(this.info);
		if ((current.page + 1) * current.pageSize >= get(this.total)) return;
		this.info.update((i) => ({
			...i,
			page: i.page + 1
		}));
	}

	/**
	 * Navigates to the previous page if available
	 *
	 * @returns {void}
	 * @example
	 * ```typescript
	 * // Check if previous page is available before calling
	 * if (paginatedData.page > 0) {
	 *   paginatedData.prev();
	 * }
	 * ```
	 */
	prev() {
		const current = get(this.info);
		if (current.page === 0) return;
		this.info.update((i) => ({
			...i,
			page: i.page - 1
		}));
	}
}
