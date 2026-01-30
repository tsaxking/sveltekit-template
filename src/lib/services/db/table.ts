/**
 * @fileoverview IndexedDB table wrapper with reactive stores.
 *
 * Provides Dexie-backed CRUD helpers and Svelte store integration.
 *
 * @example
 * import { Table } from '$lib/services/db/table';
 * const users = new Table('users', { name: 'string' });
 */
import { type Updater, type Writable, writable, get } from 'svelte/store';
import {
	_init,
	_define,
	type SchemaFieldReturnType,
	type SchemaDefinition,
	type TableStructable
} from '.';
import { attemptAsync, type ResultPromise } from 'ts-utils/check';
import { ComplexEventEmitter } from 'ts-utils/event-emitter';
import { debounce } from 'ts-utils';
import { WritableArray, WritableBase } from '$lib/services/writables';

/**
 * Configuration object for read operations that determines pagination behavior
 *
 * @export
 * @typedef {ReadConfig}
 * @template {boolean} Paginated - Whether pagination is enabled
 */
export type ReadConfig<Paginated extends boolean> = {
	/**
	 * Pagination configuration - required when Paginated is true, must be false otherwise
	 */
	pagination: Paginated extends true
		? {
				/** Current page number (0-based) */
				page: number;
				/** Number of items per page */
				pageSize: number;
			}
		: false;
};

/**
 * Table class that provides a reactive wrapper around IndexedDB tables with Dexie.
 * Offers real-time synchronization, caching, pagination, and Svelte store integration.
 *
 * @export
 * @class Table
 * @typedef {Table}
 * @template {string} Name - The table name
 * @template {SchemaDefinition} Type - The schema definition for the table
 */
export class Table<Name extends string, Type extends SchemaDefinition> {
	/**
	 * Cache for individual table data items to prevent duplicate object creation
	 *
	 * @private
	 * @readonly
	 * @type {Map<string, TableData<Name, Type>>}
	 */
	private readonly cache = new Map<string, TableData<Name, Type>>();

	/**
	 * Cache for reactive data arrays (writables) to prevent duplicate subscriptions
	 *
	 * @private
	 * @readonly
	 * @type {Map<string, TableDataArr<Name, Type>>}
	 */
	private readonly writables = new Map<string, TableDataArr<Name, Type>>();

	/**
	 * The underlying Dexie table instance
	 *
	 * @public
	 * @type {ReturnType<typeof _define<Type>>}
	 */
	public table: ReturnType<typeof _define<Type>>;

	/**
	 * Event emitter for table-level events (new, update, delete, error)
	 *
	 * @private
	 * @readonly
	 * @type {ComplexEventEmitter}
	 */
	private readonly em = new ComplexEventEmitter<{
		error: [Error];
		new: [TableData<Name, Type>];
		update: [TableData<Name, Type>];
		delete: [TableData<Name, Type>];
	}>();

	/**
	 * Subscribe to table events
	 *
	 * @public
	 * @type {Function}
	 */
	public on = this.em.on.bind(this.em);

	/**
	 * Unsubscribe from table events
	 *
	 * @public
	 * @type {Function}
	 */
	public off = this.em.off.bind(this.em);

	/**
	 * Subscribe to table events once
	 *
	 * @public
	 * @type {Function}
	 */
	public once = this.em.once.bind(this.em);

	/**
	 * Emit table events
	 *
	 * @public
	 * @type {Function}
	 */
	public emit = this.em.emit.bind(this.em);

	/**
	 * Creates an instance of Table.
	 *
	 * @constructor
	 * @param {Name} name - The name of the table
	 * @param {Type} schema - The schema definition for the table structure
	 */
	constructor(
		public name: Name,
		public schema: Type
	) {
		this.table = _define<Type>(name, schema);
	}

	/**
	 * Creates a new record in the table with auto-generated metadata
	 *
	 * @param {Object} data - The data object matching the table schema
	 * @returns {ResultPromise<TableData<Name, Type>>} Promise resolving to the created table data
	 */
	new(data: {
		[K in keyof Type]: SchemaFieldReturnType<Type[K]>;
	}) {
		return attemptAsync(async () => {
			_init();
			const newData = {
				...data,
				id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
				created_at: new Date(),
				updated_at: new Date()
			};
			await this.table().put(newData);
			const d = new TableData(this, newData);
			this.em.emit('new', d);
			return d;
		});
	}

	/**
	 * Retrieves a single record by its ID, with caching support
	 *
	 * @param {string} id - The unique identifier of the record
	 * @returns {ResultPromise<TableData<Name, Type>>} Promise resolving to the table data or error if not found
	 */
	fromId(id: string) {
		return attemptAsync(async () => {
			_init();
			const has = this.cache.get(id);
			if (has) return has;
			const data = await this.table().get(id);
			if (!data) throw new Error('Not found');
			return this.Generator(data);
		});
	}

	/**
	 * Retrieves all records as a reactive data array
	 *
	 * @param {ReadConfig<false>} config - Configuration with pagination disabled
	 * @returns {ResultPromise<TableDataArr<Name, Type>>} Promise resolving to a reactive data array
	 */
	all(config: ReadConfig<false>): ResultPromise<TableDataArr<Name, Type>>;

	/**
	 * Retrieves all records as a paginated reactive data array
	 *
	 * @param {ReadConfig<true>} config - Configuration with pagination enabled
	 * @returns {ResultPromise<PaginatedTableData<Name, Type>>} Promise resolving to a paginated data array
	 */
	all(config: ReadConfig<true>): ResultPromise<PaginatedTableData<Name, Type>>;

	/**
	 * Retrieves all records with optional pagination and real-time synchronization
	 *
	 * @param {ReadConfig<boolean>} config - Configuration object specifying pagination behavior
	 * @returns {ResultPromise<TableDataArr<Name, Type> | PaginatedTableData<Name, Type>>} Reactive data collection
	 */
	all(config: ReadConfig<boolean>) {
		return attemptAsync(async () => {
			_init();
			if (config.pagination) {
				const total = await this.table().count();
				const datas = await this.table()
					.offset(config.pagination.page * config.pagination.pageSize)
					.limit(config.pagination.pageSize)
					.toArray();
				const arr = new PaginatedTableData(
					this,
					datas.map((data) => this.Generator(data)),
					total,
					config.pagination.page,
					config.pagination.pageSize,
					async (page, pageSize) => {
						_init();
						const datas = await this.table()
							.offset(page * pageSize)
							.limit(pageSize)
							.toArray();
						return datas.map((data) => this.Generator(data));
					},
					async () => {
						return await this.table().count();
					}
				);
				const offNew = this.on('new', (d) => {
					arr.add(d);
				});
				const offDelete = this.on('delete', (d) => {
					arr.remove(d);
				});
				const offUpdate = this.on('update', () => {
					arr.inform();
				});
				arr.onAllUnsubscribe(() => {
					offNew();
					offDelete();
					offUpdate();
				});
				return arr;
			}
			const has = this.writables.get('all');
			if (has) return has;
			const datas = await this.table().toArray();
			const w = new TableDataArr(
				this,
				datas.map((data) => this.Generator(data))
			);
			this.writables.set('all', w);
			const offNew = this.on('new', (d) => {
				w.add(d);
			});
			const offDelete = this.on('delete', (d) => {
				w.remove(d);
			});
			const offUpdate = this.on('update', () => {
				w.inform();
			});
			w.onAllUnsubscribe(() => {
				offNew();
				offDelete();
				offUpdate();
			});
			return w;
		});
	}

	/**
	 * Returns a sample TableData instance for TypeScript type inference.
	 * This is only used for development and type checking - never call at runtime.
	 *
	 * @readonly
	 * @type {TableData<Name, Type>}
	 * @throws {Error} Always throws as this should never be used at runtime
	 */
	get sample(): TableData<Name, Type> {
		throw new Error('Not to be used at runtime');
	}

	/**
	 * Creates or retrieves a cached TableData instance for the given data.
	 * Ensures singleton behavior for each record to maintain referential equality.
	 *
	 * @param {TableStructable<Type>} data - The raw data object from the database
	 * @returns {TableData<Name, Type>} Wrapped table data instance
	 */
	Generator(data: TableStructable<Type>) {
		const cached = this.cache.get(data.id);
		if (cached) {
			return cached;
		}
		const d = new TableData(this, data);
		this.cache.set(data.id, d);
		return d;
	}

	/**
	 * Clears all records from the table
	 *
	 * @returns {ResultPromise<void>} Promise that resolves when the table is cleared
	 */
	clear() {
		return attemptAsync(async () => {
			_init();
			await this.table().clear();
		});
	}

	/**
	 * Creates an empty reactive data array for this table
	 *
	 * @returns {TableDataArr<Name, Type>} Empty reactive data array
	 */
	arr() {
		return new TableDataArr(this, []);
	}

	get(
		data: {
			[K in keyof Type]?: SchemaFieldReturnType<Type[K]>;
		},
		config: ReadConfig<boolean>
	): ResultPromise<TableDataArr<Name, Type> | PaginatedTableData<Name, Type>> {
		return attemptAsync(async () => {
			_init();

			if (config.pagination) {
				const total = await this.table().where(data).count();
				const datas = await this.table()
					.where(data)
					.offset(config.pagination.page * config.pagination.pageSize)
					.limit(config.pagination.pageSize);
				const arr = new PaginatedTableData(
					this,
					(await datas.toArray()).map((d) => this.Generator(d)),
					total,
					config.pagination.page,
					config.pagination.pageSize,
					async (page, pageSize) => {
						_init();
						const datas = await this.table()
							.where(data)
							.offset(page * pageSize)
							.limit(pageSize)
							.toArray();
						return datas.map((d) => this.Generator(d));
					},
					async () => {
						return await this.table().where(data).count();
					}
				);

				return arr;
			}

			const datas = await this.table().where(data);
			const arr = new TableDataArr(
				this,
				(await datas.toArray()).map((d) => this.Generator(d))
			);

			const onNew = (d: TableData<Name, Type>) => {
				for (const key in data) {
					if (d.data[key] !== data[key]) {
						return;
					}
				}
				arr.add(d);
			};
			const onDelete = (d: TableData<Name, Type>) => {
				for (const key in data) {
					if (d.data[key] !== data[key]) {
						return;
					}
				}
				arr.remove(d);
			};

			const onUpdate = (d: TableData<Name, Type>) => {
				let match = true;
				for (const key in data) {
					if (d.data[key] !== data[key]) {
						match = false;
					}
				}
				if (match) {
					arr.add(d);
				} else {
					arr.remove(d);
				}
			};

			const offNew = this.on('new', onNew);
			const offDelete = this.on('delete', onDelete);
			const offUpdate = this.on('update', onUpdate);

			arr.onAllUnsubscribe(() => {
				offNew();
				offDelete();
				offUpdate();
			});

			return arr;
		});
	}
}

/**
 * Reactive wrapper for individual table records that implements Svelte's Writable store interface.
 * Provides automatic persistence and event emission when data changes.
 *
 * @export
 * @class TableData
 * @typedef {TableData}
 * @template {string} Name - The table name
 * @template {SchemaDefinition} Type - The schema definition
 * @implements {Writable<TableStructable<Type>>}
 */
export class TableData<Name extends string, Type extends SchemaDefinition> extends WritableBase<
	TableStructable<Type>
> {
	/**
	 * Creates an instance of TableData.
	 *
	 * @constructor
	 * @param {Table<Name, Type>} table - Reference to the parent table
	 * @param {TableStructable<Type>} data - The actual data object
	 */
	constructor(
		public table: Table<Name, Type>,
		data: TableStructable<Type>
	) {
		super(data);
	}

	/**
	 * Sets the entire record data and persists to database (Svelte store interface)
	 *
	 * @param {TableStructable<Type>} value - New data to set
	 * @returns {AttemptAsync<void>} Promise that resolves when data is saved
	 * @example
	 * ```typescript
	 * await user.set({
	 *   ...userData,
	 *   name: 'Updated Name',
	 *   updatedAt: new Date()
	 * }).unwrap();
	 * ```
	 */
	set(value: TableStructable<Type>) {
		return attemptAsync(async () => {
			this.data = value;
			await this.save().unwrap();
		});
	}

	/**
	 * Updates the record using an updater function and persists to database (Svelte store interface)
	 *
	 * @param {Updater<TableStructable<Type>>} fn - Function that receives current data and returns new data
	 * @returns {AttemptAsync<void>} Promise that resolves when data is saved
	 * @example
	 * ```typescript
	 * await user.update(data => ({
	 *   ...data,
	 *   lastLoginAt: new Date(),
	 *   loginCount: data.loginCount + 1
	 * })).unwrap();
	 * ```
	 */
	update(fn: Updater<TableStructable<Type>>) {
		return attemptAsync(async () => {
			await this.set(fn(this.data)).unwrap();
		});
	}

	/**
	 * Persists the current data to the database and emits update events
	 *
	 * @private
	 * @returns {AttemptAsync<void>} Promise that resolves when data is saved
	 */
	private save() {
		return attemptAsync(async () => {
			_init();
			this.data.updated_at = new Date();
			await this.table.table().put(this.data);
			this.inform();
			this.table.emit('update', this);
		});
	}

	/**
	 * Deletes this record from the database and emits delete event
	 *
	 * @returns {AttemptAsync<void>} Promise that resolves when record is deleted
	 * @example
	 * ```typescript
	 * await user.delete().unwrap();
	 * console.log('User deleted');
	 * ```
	 */
	delete() {
		return attemptAsync(async () => {
			_init();
			await this.table.table().delete(this.data.id);
			this.table.emit('delete', this);
		});
	}
}

/**
 * Reactive array of table records that implements Svelte's Writable store interface.
 * Provides automatic synchronization with database changes and event-driven updates.
 *
 * @export
 * @class TableDataArr
 * @typedef {TableDataArr}
 * @template {string} Name - The table name
 * @template {SchemaDefinition} Type - The schema definition
 * @implements {Writable<TableData<Name, Type>[]>}
 */
export class TableDataArr<Name extends string, Type extends SchemaDefinition> extends WritableArray<
	TableData<Name, Type>
> {
	/**
	 * Event emitter for array-level events (add/remove)
	 *
	 * @private
	 * @readonly
	 * @type {ComplexEventEmitter}
	 */
	private readonly em = new ComplexEventEmitter<{
		add: [TableData<Name, Type>];
		remove: [TableData<Name, Type>];
	}>();

	/** Event listener for 'add' and 'remove' events */
	public on = this.em.on.bind(this.em);
	/** Remove event listener */
	public off = this.em.off.bind(this.em);
	/** Listen once for event */
	public once = this.em.once.bind(this.em);
	/** Emit array events */
	public emit = this.em.emit.bind(this.em);

	/**
	 * Creates an instance of TableDataArr.
	 *
	 * @constructor
	 * @param {Table<Name, Type>} table - Reference to the parent table
	 * @param {TableData<Name, Type>[]} data - Initial array of table data
	 */
	constructor(
		public table: Table<Name, Type>,
		data: TableData<Name, Type>[]
	) {
		super(data);
	}

	/**
	 * Immediate notification for critical updates
	 *
	 * @private
	 * @returns {void}
	 */
	_informImmediate() {
		for (const s of this.subscribers) {
			const data = this.data.filter(this._filter).sort(this._sort);
			if (this._reverse) data.reverse();
			s(data);
		}
	}

	/**
	 * Debounced notification for performance optimization (~60fps)
	 *
	 * @private
	 * @type {() => void}
	 */
	_informDebounced = debounce(() => {
		this._informImmediate();
	}, __APP_ENV__.indexed_db.debounce_interval_ms);

	/**
	 * Public inform method that uses debounced updates by default
	 *
	 * @param {boolean} [immediate=false] - If true, notifies immediately; otherwise debounced
	 * @returns {void}
	 */
	public inform(immediate = false) {
		if (immediate) {
			this._informImmediate();
		} else {
			this._informDebounced();
		}
	}

	/**
	 * Adds an item to the array, ensuring uniqueness by ID
	 *
	 * @param {TableData<Name, Type>} item - Item to add to the array
	 * @returns {void}
	 */
	add(item: TableData<Name, Type>) {
		const len = this.data.length;
		this.data.push(item);
		this.data = this.data.filter((v, i, a) => a.findIndex((dd) => dd.data.id === v.data.id) === i);
		if (this.data.length !== len) {
			this.emit('add', item);
		}
		this.inform(); // Debounced for event-driven updates
	}

	/**
	 * Removes items from the array based on a predicate function
	 * @param fn - Predicate function to determine which items to remove
	 */
	remove(fn: (item: TableData<Name, Type>) => boolean): void;
	/**
	 * Removes specific items from the array by ID
	 * @param items - Items to remove from the array
	 */
	remove(...items: TableData<Name, Type>[]): void;
	/**
	 * Removes items from the array by ID or based on a predicate function
	 *
	 * @param items - Predicate function or specific items to remove
	 * @returns {void}
	 */
	remove(...items: (TableData<Name, Type> | ((item: TableData<Name, Type>) => boolean))[]): void {
		const len = this.data.length;

		// If first argument is a function, treat it as a predicate
		if (items.length === 1 && typeof items[0] === 'function') {
			const predicate = items[0] as (item: TableData<Name, Type>) => boolean;
			const removed = this.data.filter(predicate);
			this.data = this.data.filter((d) => !predicate(d));
			if (this.data.length !== len && removed.length > 0) {
				for (const item of removed) {
					this.emit('remove', item);
				}
			}
		} else {
			// Otherwise, remove all specified items by ID
			const itemsToRemove = items as TableData<Name, Type>[];
			const idsToRemove = new Set(itemsToRemove.map((item) => item.data.id));
			this.data = this.data.filter((d) => !idsToRemove.has(d.data.id));
			if (this.data.length !== len) {
				for (const item of itemsToRemove) {
					this.emit('remove', item);
				}
			}
		}

		this.inform(); // Debounced for event-driven updates
	}
}

/**
 * Paginated extension of TableDataArr that provides pagination functionality.
 * Manages page state, total counts, and automatic data refresh on navigation.
 *
 * @export
 * @class PaginatedTableData
 * @typedef {PaginatedTableData}
 * @template {string} Name - The table name
 * @template {SchemaDefinition} Type - The schema definition
 * @extends {TableDataArr<Name, Type>}
 */
export class PaginatedTableData<
	Name extends string,
	Type extends SchemaDefinition
> extends TableDataArr<Name, Type> {
	/**
	 * Reactive pagination information store
	 *
	 * @public
	 * @readonly
	 * @type {Writable<{total: number, page: number, pageSize: number}>}
	 */
	public readonly info: Writable<{
		page: number;
		pageSize: number;
	}>;

	public readonly total: Writable<number>;

	/**
	 * Creates an instance of PaginatedTableData.
	 *
	 * @constructor
	 * @param {Table<Name, Type>} table - Reference to the parent table
	 * @param {TableData<Name, Type>[]} data - Initial page data
	 * @param {number} total - Total number of records
	 * @param {number} page - Current page number (0-based)
	 * @param {number} pageSize - Number of items per page
	 * @param {(page: number, pageSize: number) => Promise<TableData<Name, Type>[]>} getter - Function to fetch page data
	 * @param {() => Promise<number>} getTotal - Function to get total count
	 */
	constructor(
		table: Table<Name, Type>,
		data: TableData<Name, Type>[],
		total: number,
		page: number,
		pageSize: number,
		getter: (page: number, pageSize: number) => Promise<TableData<Name, Type>[]>,
		getTotal: () => Promise<number>
	) {
		super(table, data);
		this.info = writable({
			total,
			page,
			pageSize
		});
		this.total = writable(total);

		// Set up automatic data refresh when pagination info changes
		this.info.subscribe(async (info) => {
			const newData = await getter(info.page, info.pageSize);
			this.data = newData;
			this.inform(true); // Immediate for pagination changes
			this.total.set(await getTotal());
		});

		// Refresh data when items are added
		this.on('add', async () => {
			const current = get(this.info);
			const newData = await getter(current.page, current.pageSize);
			this.data = newData;
			this.total.update((t) => t + 1);
			this.inform(); // Debounced for event-driven updates
		});

		// Refresh data when items are removed
		this.on('remove', async () => {
			const current = get(this.info);
			const newData = await getter(current.page, current.pageSize);
			this.data = newData;
			this.total.update((t) => t - 1);
			this.inform(); // Debounced for event-driven updates
		});
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
	 * @param {number} p - New page number (0-based)
	 */
	set page(p: number) {
		this.info.update((i) => ({
			...i,
			page: p
		}));
	}
	/**
	 * Navigates to the next page if available
	 *
	 * @returns {void}
	 * @example
	 * ```typescript
	 * if (pagination.page < Math.ceil(pagination.total / pagination.pageSize) - 1) {
	 *   pagination.next();
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
	 * if (pagination.page > 0) {
	 *   pagination.prev();
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
