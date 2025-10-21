import { Struct, type Blank } from './index';
import { get, writable, type Writable } from 'svelte/store';
import { StructData } from './struct-data';
import { EventEmitter } from 'ts-utils/event-emitter';

const debounce = <T extends (...args: unknown[]) => void | Promise<void>>(
	func: T,
	delay: number
) => {
	let timeoutId: NodeJS.Timeout;
	return ((...args: unknown[]) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			func(...args);
		}, delay);
	}) as T;
};

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
	 *Removes data from the array and updates the subscribers
	 *
	 * @public
	 * @param {...StructData<T>[]} values
	 */
	public remove(...values: StructData<T>[]): void {
		const current = [...this.data];
		this.apply(this.data.filter((value) => !values.includes(value)));
		if (this.data.length < current.length) {
			this.emit('remove', values);
		}
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
		this.apply(this.data);
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
		this.apply(this.data);
	}

	/**
	 * Indicates whether the current sort order is reversed
	 */
	private _reverse = false;

	/**
	 * Toggles the sort order between ascending and descending
	 */
	reverse() {
		this._reverse = !this._reverse;
		this.apply(this.data);
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
