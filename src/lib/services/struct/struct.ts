/**
 * @fileoverview Client-side struct implementation with caching and batching.
 *
 * Provides the core Struct client API, data wrappers, and remote bindings.
 *
 * @example
 * import { Struct } from '$lib/services/struct';
 * const Users = new Struct({ name: 'users', structure: { name: 'string' }, socket: sse });
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { attempt, attemptAsync } from 'ts-utils/check';
import { ComplexEventEmitter } from 'ts-utils/event-emitter';
import { match } from 'ts-utils/match';
import { Stream } from 'ts-utils/stream';
import type { ColType, globalCols } from 'drizzle-struct';
import { z } from 'zod';
import { StructDataVersion } from './data-version';
import { StructData } from './struct-data';
import { StructDataStage } from './data-staging';
import { DataArr, PaginationDataArr } from './data-arr';
import * as remote from '$lib/remotes/struct.remote';
import { browser } from '$app/environment';
import { WritableBase } from '../writables';

// let didCacheWarning = false;

// const cacheWarning = () => {
// 	if (__APP_ENV__.environment === 'prod') return;
// 	if (didCacheWarning) return;
// 	didCacheWarning = true;
// 	console.warn(
// 		`⚠️⚠️⚠️ Cache Warning: By using Struct Caching, you may be serving stale data to users. Be sure to limit cache duration appropriately. You can view your cache in the index db under the database: ${__APP_ENV__.indexed_db.db_name}.`
// 	);
// };

/**
 * All actions that can be performed on the data
 *
 * @export
 * @enum {number}
 */
export enum FetchActions {
	/**
	 * Create a new data point
	 */
	Create = 'create',
	/**
	 * Delete a data point
	 */
	Delete = 'delete',
	/**
	 * Archive a data point
	 */
	Archive = 'archive',
	/**
	 * Restore an archived data point
	 */
	RestoreArchive = 'restore-archive',
	/**
	 * Restore a version of a data point
	 */
	RestoreVersion = 'restore-version',
	/**
	 * Delete a version of a data point
	 */
	DeleteVersion = 'delete-version',
	/**
	 * Retrieve a data's version history
	 */
	ReadVersionHistory = 'read-version-history',
	/**
	 * Get the archived data
	 */
	ReadArchive = 'read-archive',
	/**
	 * Read a data
	 */
	Read = 'read',
	/**
	 * Update a data point
	 */
	Update = 'update'
}

/**
 * Error if the data is an invalid state
 *
 * @export
 * @class DataError
 * @typedef {DataError}
 * @extends {Error}
 */
export class DataError extends Error {
	/**
	 * Creates an instance of DataError.
	 *
	 * @constructor
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = 'DataError';
	}
}

/**
 * Error if the struct is an invalid state
 *
 * @export
 * @class StructError
 * @typedef {StructError}
 * @extends {Error}
 */
export class StructError extends Error {
	/**
	 * Creates an instance of StructError.
	 *
	 * @constructor
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = 'StructError';
	}
}

/**
 * Error if the data is an invalid state, this should crash the application so use sparingly
 *
 * @export
 * @class FatalDataError
 * @typedef {FatalDataError}
 * @extends {Error}
 */
export class FatalDataError extends Error {
	/**
	 * Creates an instance of FatalDataError.
	 *
	 * @constructor
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = 'FatalDataError';
	}
}

/**
 * Error if the struct is an invalid state, this should crash the application so use sparingly
 *
 * @export
 * @class FatalStructError
 * @typedef {FatalStructError}
 * @extends {Error}
 */
export class FatalStructError extends Error {
	/**
	 * Creates an instance of FatalStructError.
	 *
	 * @constructor
	 * @param {string} message
	 */
	constructor(message: string) {
		super(message);
		this.name = 'FatalStructError';
	}
}

/**
 * Websocket/SSE connection to the server
 *
 * @export
 * @interface Socket
 * @typedef {Socket}
 */
export interface Socket {
	/**
	 * Event listener for the socket
	 *
	 * @param {string} event
	 * @param {(data: unknown) => void} lisener
	 */
	on(event: string, lisener: (data: unknown) => void): void;
}

/**
 * Generates a type from a column type
 *
 * @export
 * @typedef {ColTsType}
 * @template {ColType} t
 */
export type ColTsType<t extends ColType> = t extends 'string'
	? string
	: t extends 'number'
		? number
		: t extends 'boolean'
			? boolean
			: t extends 'array'
				? unknown[]
				: t extends 'json'
					? unknown
					: t extends 'date'
						? Date
						: t extends 'bigint'
							? bigint
							: t extends 'custom'
								? unknown
								: t extends 'buffer'
									? Buffer
									: never;
/**
 * Generates a safe type from a column type
 *
 * @export
 * @typedef {ColTsType}
 * @template {ColType} t
 */
export type SafeColTsType<t extends ColType> = t extends 'string'
	? string
	: t extends 'number'
		? number
		: t extends 'boolean'
			? boolean
			: t extends 'array'
				? unknown[]
				: t extends 'json'
					? unknown
					: t extends 'date'
						? string
						: t extends 'bigint'
							? bigint
							: t extends 'custom'
								? unknown
								: t extends 'buffer'
									? Buffer
									: never;

/**
 * Blank struct type
 *
 * @export
 * @typedef {Blank}
 */
export type Blank = Record<string, ColType>;

/**
 * Configuration for a struct
 *
 * @export
 * @typedef {StructBuilder}
 * @template {Blank} T
 */
export type StructBuilder<T extends Blank> = {
	/**
	 * Name of the struct, this is used to identify the struct between the front and back ends
	 */
	name: string;
	/**
	 * Structure of the struct, this is used to validate the data and typing
	 */
	structure: T;
	/**
	 * Websocket/SSE connection to the server, must be present if the struct is to be used
	 */
	socket: Socket;
	/**
	 * Log all actions to the console (only use for development because this could log sensitive data and may slow down the application)
	 */
	log?: boolean;

	/**
	 * Whether the struct is a browser struct, this is used to prevent fetch requests on the server when sveltekit is doing SSR
	 */
	browser: boolean;

	cacheUpdates?: boolean;
};

/**
 * Not all users may have full read access to data, so all properties will be optional
 *
 * @export
 * @typedef {PartialStructable}
 * @template {Blank} T
 */
export type PartialStructable<T extends Blank> = {
	[K in keyof T]?: ColTsType<T[K]>;
};

export type SafePartialStructable<T extends Blank> = {
	[K in keyof T]?: SafeColTsType<T[K]>;
};

/**
 * All users may have full read access to some data, so all properties will be required from this type
 *
 * @export
 * @typedef {Structable}
 * @template {Blank} T
 */
export type Structable<T extends Blank> = {
	[K in keyof T]: ColTsType<T[K]>;
};

/**
 * General status message for all actions. Use this format when generating your eventHandler() on the back end
 *
 * @export
 * @typedef {StatusMessage}
 * @template [T=void]
 */
export type StatusMessage<T = void> = {
	success: boolean;
	data?: T;
	message?: string;
};

/**
 * Writable store that holds a single StructData item and allows updates to it.
 * This is useful for managing a single piece of data that can be updated and subscribed to.
 * For example, it can be used to manage a single user profile or settings.
 * This differs from the StructData class in that it is a writable store and is meant to be used in a reactive context.
 * This differs from the StructDataProxy in that it does not proxy the data and is meant to be used in a reactive context.
 *
 * @example When you initialize a SingleWritable, you can pass in a default data object (guest user)
 * 	And then once the user data is retrieved from the server, you can set the data using `set` method and the subscribers will be notified.
 *
 * @export
 * @class SingleWritable
 * @typedef {SingleWritable}
 * @template {Blank} T
 * @extends {WritableBase<StructData<T>>}
 */
export class SingleWritable<T extends Blank> extends WritableBase<StructData<T>> {
	/**
	 * Creates an instance of SingleWritable.
	 *
	 * @constructor
	 * @param {StructData<T>} defaultData
	 */
	constructor(defaultData: StructData<T>) {
		super(defaultData);
		const offupdate = this.struct.on('update', (data) => {
			if (data.data.id === this.data.data.id) {
				this.set(data);
			}
		});
		const offarchive = this.struct.on('archive', (data) => {
			if (data.data.id === this.data.data.id) {
				this.set(data);
			}
		});
		const offrestore = this.struct.on('restore', (data) => {
			if (data.data.id === this.data.data.id) {
				this.set(data);
			}
		});

		this.onAllUnsubscribe(() => {
			offupdate();
			offarchive();
			offrestore();
		});
	}

	get struct() {
		return this.data.struct;
	}
}

/**
 * Stream of StructData
 *
 * @export
 * @class StructStream
 * @typedef {StructStream}
 * @template {Blank} T
 * @extends {Stream<StructData<T>>}
 */
export class StructStream<T extends Blank> extends Stream<StructData<T>> {
	/**
	 * Creates an instance of StructStream.
	 *
	 * @constructor
	 * @param {Struct<T>} struct
	 */
	constructor(public readonly struct: Struct<T>) {
		super();
	}
}

/**
 * All events that can be received from the server
 *
 * @export
 * @typedef {StructEvents}
 * @template {Blank} T
 */
export type StructEvents<T extends Blank> = {
	new: [StructData<T>];
	update: [StructData<T>];
	delete: [StructData<T>];
	archive: [StructData<T>];
	restore: [StructData<T>];

	connect: void;
};

/**
 * Global columns that are required for all data
 *
 * @typedef {GlobalCols}
 */
export type GlobalCols = {
	id: 'string';
	created: 'date';
	updated: 'date';
	archived: 'boolean';
	attributes: 'string';
	lifetime: 'number';
	canUpdate: 'boolean';
	hash: 'string';
};

type ReadConfigType = 'stream' | 'all' | 'pagination';

/**
 * Configuration object for read operations that determines return type and caching behavior
 *
 * @export
 * @typedef {ReadConfig}
 * @template {boolean} AsStream
 */
export type ReadConfig<AsStream extends ReadConfigType, T extends Blank> = AsStream extends 'all'
	? {
			/**
			 * Determines the return type: true returns a StructStream, false returns a DataArr
			 */
			type: AsStream;
			/**
			 * Optional cache configuration for server-side caching
			 */
			cache?: {
				/**
				 * Date when the cached data expires
				 */
				expires: Date;
			};
			force?: boolean;
			keys?: (keyof T & keyof typeof globalCols)[];
		}
	: {
			type: 'pagination';
			cache?: {
				expires: Date;
			};
			pagination: {
				page: number;
				size: number;
			};
			force?: boolean;
			keys?: (keyof T & keyof typeof globalCols)[];
		};

/**
 * Struct class that communicates with the server
 *
 * @export
 * @class Struct
 * @typedef {Struct}
 * @template {Blank} T
 */
export class Struct<T extends Blank> {
	/**
	 * A changable function that can be used to get the current date.
	 * This is used for syncing date with the server through NTP
	 *
	 * @returns {*}
	 */
	public static getDate: () => number = () => Date.now(); // can be changed for syncing

	/**
	 * Headers that are sent with every request to the server from the struct
	 *
	 * @public
	 * @static
	 * @readonly
	 * @type {*}
	 */
	public static readonly headers = new Map<string, string>();
	/**
	 * All structs that are accessible
	 *
	 * @public
	 * @static
	 * @readonly
	 * @type {*}
	 */
	public static readonly structs = new Map<string, Struct<Blank>>();

	/**
	 * Iterates over all structs and runs a function on each one.
	 *
	 * @public
	 * @static
	 * @param {(struct: Struct<Blank>) => void} fn
	 * @returns {void) => void}
	 */
	public static each(fn: (struct: Struct<Blank>) => void) {
		for (const struct of Struct.structs.values()) {
			fn(struct);
		}
	}

	/**
	 * Builds all structs that are registered in the system.
	 *
	 * @public
	 * @static
	 */
	public static buildAll() {
		Struct.each((s) => s.build().then((res) => res.isErr() && console.error(res.error)));
	}

	/**
	 * Cached writables for automatic updating
	 *
	 * @private
	 * @readonly
	 * @type {*}
	 */
	private readonly writables = new Map<string, DataArr<T>>();

	/**
	 * Registry of data arrays with their satisfy functions for centralized event handling
	 *
	 * @private
	 * @readonly
	 * @type {*}
	 */
	private readonly dataArrayRegistry = new Map<
		string,
		{
			dataArr: DataArr<T>;
			satisfies: (data: StructData<T>) => boolean;
			includeArchived?: boolean;
		}
	>();

	/**
	 * Flag to track if centralized listeners have been set up
	 *
	 * @private
	 * @type {boolean}
	 */
	private centralizedListenersSetup = false;

	/**
	 * Event emitter for all events
	 *
	 * @private
	 * @readonly
	 * @type {*}
	 */
	private readonly emitter = new ComplexEventEmitter<StructEvents<T>>();

	/**
	 * Whether to cache updates for this struct.
	 *
	 * @public
	 * @readonly
	 * @type {boolean}
	 */
	public readonly cacheUpdates: boolean;

	/**
	 * Listens to an event
	 *
	 * @public
	 * @type {*}
	 */
	public readonly on = this.emitter.on.bind(this.emitter);
	/**
	 * Stops listening to an event
	 *
	 * @public
	 * @type {*}
	 */
	public readonly off = this.emitter.off.bind(this.emitter);
	/**
	 * Listens to an event once
	 *
	 * @public
	 * @type {*}
	 */
	public readonly once = this.emitter.once.bind(this.emitter);
	/**
	 * Emits an event
	 *
	 * @public
	 * @type {*}
	 */
	public readonly emit = this.emitter.emit.bind(this.emitter);

	/**
	 * Cache of StructData, used for updates and optimziations
	 *
	 * @private
	 * @readonly
	 * @type {*}
	 */
	private readonly cache = new Map<string, StructData<T>>();

	/**
	 * Creates an instance of Struct.
	 *
	 * @constructor
	 * @param {StructBuilder<T>} data
	 */
	constructor(public readonly data: StructBuilder<T>) {
		Struct.structs.set(data.name, this as any);
		this.cacheUpdates = data.cacheUpdates ?? true; // default to true
	}

	/**
	 * Creates a new data point, if permitted
	 *
	 * @param {Structable<T>} data
	 * @returns {*}
	 */
	new(data: Structable<T>, attributes: string[] = []) {
		return attemptAsync<StatusMessage>(async () => {
			return remote.create({
				struct: this.data.name,
				data,
				attributes
			});
		});
	}

	/**
	 * Updates an existing data point, if permitted
	 * This should never be used in production, just for testing types
	 *
	 * @readonly
	 * @type {StructData<T>}
	 */
	get sample(): StructData<T> {
		throw new Error('Sample is not meant to used at runtime.');
	}

	/**
	 * Returns a sample of the struct data, which is a StructData object
	 * This is used for testing and development purposes only.
	 *
	 * @readonly
	 * @type {StructDataVersion<T>}
	 */
	get vhSample(): StructDataVersion<T> {
		throw new Error('vhSample is not meant to be used at runtime');
	}

	/**
	 * Sets up centralized event listeners for all data arrays
	 *
	 * @private
	 * @returns {*}
	 */
	private setupCentralizedListeners() {
		if (this.centralizedListenersSetup) return;

		const handleDataEvent = (
			eventType: 'new' | 'update' | 'delete' | 'archive' | 'restore',
			data: StructData<T>
		) => {
			this.log(`Centralized ${eventType} event:`, data.data);

			// Update all registered data arrays based on their satisfy functions
			for (const [key, { dataArr, satisfies, includeArchived = false }] of this.dataArrayRegistry) {
				const shouldInclude = satisfies(data);
				const isCurrentlyIncluded = dataArr.data.includes(data);
				const isArchived = data.data.archived;

				this.log(
					`Checking data array ${key}: shouldInclude=${shouldInclude}, isCurrentlyIncluded=${isCurrentlyIncluded}, isArchived=${isArchived}, includeArchived=${includeArchived}`
				);

				switch (eventType) {
					case 'new':
					case 'restore':
						if (shouldInclude && !isCurrentlyIncluded && (!isArchived || includeArchived)) {
							this.log(`Adding data to ${key}`);
							dataArr.add(data);
						}
						break;

					case 'update':
						if (shouldInclude && !isCurrentlyIncluded && (!isArchived || includeArchived)) {
							this.log(`Adding updated data to ${key}`);
							dataArr.add(data);
						} else if (!shouldInclude && isCurrentlyIncluded) {
							this.log(`Removing updated data from ${key}`);
							dataArr.remove(data);
						} else if (isCurrentlyIncluded) {
							this.log(`Informing update for ${key}`);
							dataArr.inform();
						}
						break;

					case 'delete':
						if (isCurrentlyIncluded) {
							this.log(`Removing deleted data from ${key}`);
							dataArr.remove(data);
						}
						break;

					case 'archive':
						if (isCurrentlyIncluded && !includeArchived) {
							this.log(`Removing archived data from ${key}`);
							dataArr.remove(data);
						} else if (isCurrentlyIncluded) {
							this.log(`Informing archive update for ${key}`);
							dataArr.inform();
						}
						break;
				}
			}
		};

		// Set up single event listeners
		this.on('new', (data) => handleDataEvent('new', data));
		this.on('update', (data) => handleDataEvent('update', data));
		this.on('delete', (data) => handleDataEvent('delete', data));
		this.on('archive', (data) => handleDataEvent('archive', data));
		this.on('restore', (data) => handleDataEvent('restore', data));

		this.centralizedListenersSetup = true;
		this.log('Centralized listeners set up');
	}

	/**
	 * Registers a data array with its satisfy function for centralized event handling
	 *
	 * @private
	 * @param {string} key
	 * @param {DataArr<T>} dataArr
	 * @param {(data: StructData<T>) => boolean} satisfies
	 * @param {?boolean} [includeArchived]
	 */
	private registerDataArray(
		key: string,
		dataArr: DataArr<T>,
		satisfies: (data: StructData<T>) => boolean,
		includeArchived?: boolean
	) {
		this.setupCentralizedListeners();

		this.dataArrayRegistry.set(key, {
			dataArr,
			satisfies,
			includeArchived
		});

		// Set up cleanup when all subscribers unsubscribe
		dataArr.onAllUnsubscribe(() => {
			this.log(`Unregistering data array ${key}`);
			this.dataArrayRegistry.delete(key);
			this.writables.delete(key);
		});

		this.log(`Registered data array ${key}`);
	}

	/**
	 * Sets listeners for the struct. Runs when the struct is built
	 *
	 * @private
	 * @returns {*}
	 */
	private setListeners() {
		return attempt(() => {
			this.data.socket.on(`struct:${this.data.name}`, (data) => {
				this.log('Event Data:', data);
				const parsed = z
					.object({
						event: z.enum(['create', 'update', 'archive', 'delete', 'restore', 'stream']),
						data: z.record(z.unknown())
					})
					.safeParse(data);
				if (!parsed.success) {
					return console.error('Invalid data:', parsed.error, data);
				}
				const { event, data: structData } = parsed.data as {
					event: 'create' | 'update' | 'archive' | 'delete' | 'restore' | 'stream';
					data: PartialStructable<T & GlobalCols>;
				};
				const { id } = structData;

				this.log('Event:', event);
				this.log('Data:', structData);

				if (!id) throw new Error('Data must have an id');

				match(event)
					.case('archive', () => {
						this.log('Archive:', structData);
						const d = this.cache.get(id);
						if (d) {
							d.set({
								...d.data,
								archived: true
							});
							this.emit('archive', d);
						}
					})
					.case('create', () => {
						this.log('Create:', structData);
						const exists = this.cache.get(id);
						if (exists) return;
						const d = new StructData(this, structData);
						this.cache.set(id, d);
						this.emit('new', d);
					})
					.case('stream', () => {
						this.log('Stream:', structData);
						const exists = this.cache.get(id);
						if (exists) return;
						const d = new StructData(this, structData);
						this.cache.set(id, d);
						this.emit('new', d);
					})
					.case('delete', () => {
						this.log('Delete:', structData);
						const d = this.cache.get(id);
						if (d) {
							this.cache.delete(id);
							this.log('Deleted:', d.data);
							this.emit('delete', d);
						}
					})
					.case('restore', () => {
						this.log('Restore:', structData);
						const d = this.cache.get(id);
						if (d) {
							d.set({
								...d.data,
								archived: false
							});
							this.emit('restore', d);
						}
					})
					.case('update', () => {
						this.log('Update:', structData);
						const d = this.cache.get(id);
						if (d) {
							this.log('Data exists, updating');
							d.set(structData);
							this.emit('update', d);
						} else {
							this.log('Data does not exist, creating');
							const d = new StructData(this, structData);
							this.cache.set(id, d);
							this.emit('new', d);
						}
					})
					.default(() => console.error('Invalid event:', event))
					.exec();
			});
		});
	}

	/**
	 * Generates a StructData object from the given data, or returns the cached version if it exists.
	 *
	 * @param {(SafePartialStructable<T & GlobalCols>)} data
	 * @returns {StructData<T>}
	 */
	Generator(data: SafePartialStructable<T & GlobalCols>): StructData<T> {
		if (Object.hasOwn(data, 'id')) {
			const id = (data as { id: string }).id;
			if (this.cache.has(id)) {
				return this.cache.get(id) as StructData<T>;
			}
		}

		const assembled: PartialStructable<T & GlobalCols> = {};
		const structure = {
			...this.data.structure,
			id: 'string',
			created: 'date',
			updated: 'date',
			archived: 'boolean',
			attributes: 'string',
			lifetime: 'number',
			canUpdate: 'boolean'
		};

		for (const [key, value] of Object.entries(data)) {
			if (structure[key] === 'date') {
				(assembled as any)[key] = new Date(value) as any; // convert string to Date
			} else {
				(assembled as any)[key] = value as any; // keep the value as is
			}
		}

		const d = new StructData(this, assembled);

		if (Object.hasOwn(data, 'id')) {
			this.cache.set(data.id as string, d as any);
		}

		const res = this.getZodSchema({
			optionals: Object.keys(structure)
		}).safeParse(assembled);
		if (!res.success) {
			console.warn(`Data does not match ${this.data.name}'s schema:`, res.error, d);
		}

		return d;
	}

	/**
	 * Creates a StructDataProxy from the given data.
	 *
	 * @param {StructData<T & GlobalCols>} data
	 * @returns {StructDataProxy<T & GlobalCols>}
	 */
	Stage(data: StructData<(T & GlobalCols) | T>) {
		return new StructDataStage(data);
	}

	/**
	 * Validates the data
	 *
	 * @param {unknown} data
	 * @returns {(data is PartialStructable<T & GlobalCols>)}
	 */
	validate(data: unknown): data is PartialStructable<T & GlobalCols> {
		if (typeof data !== 'object' || data === null) return false;
		for (const key in data) {
			if (!Object.hasOwn(this.data.structure, key)) return false;
			const type = this.data.structure[key];
			const value = (data as any)[key];
			if (typeof value === 'undefined') continue; // likely does not have permission to read
			if (typeof value !== type) return false;
		}

		return true;
	}

	/**
	 * Generates a Zod schema for the struct data.
	 *
	 * @param {?{
	 * 		optionals?: ((keyof T & keyof GlobalCols) | string)[];
	 * 		not?: ((keyof T & keyof GlobalCols) | string)[];
	 * 	}} [config]
	 * @returns {*}
	 */
	getZodSchema(config?: {
		optionals?: ((keyof T & keyof GlobalCols) | string)[];
		not?: ((keyof T & keyof GlobalCols) | string)[];
	}) {
		const createSchema = (key: keyof T & keyof GlobalCols, type: z.ZodType) => {
			if (config?.optionals?.includes(key)) return [key, type.optional()];
			return [key, type];
		};

		return z.object({
			...Object.fromEntries(
				Object.entries({
					...this.data.structure,
					id: 'string',
					created: 'date',
					updated: 'date',
					archived: 'boolean',
					attributes: 'string',
					lifetime: 'number',
					canUpdate: 'boolean'
				}).map(([key, value]) => {
					if (config?.not?.includes(key as any)) return [];
					switch (value) {
						case 'string':
							return createSchema(key as any, z.string());
						case 'number':
							return createSchema(key as any, z.number());
						case 'boolean':
							return createSchema(key as any, z.boolean());
						case 'array':
							return createSchema(key as any, z.array(z.unknown()));
						case 'json':
							return createSchema(key as any, z.string());
						case 'date':
							return createSchema(key as any, z.date());
						case 'bigint':
							return createSchema(key as any, z.bigint());
						case 'custom':
							return createSchema(key as any, z.unknown());
						case 'buffer':
							return createSchema(key as any, z.unknown());
						default:
							return [];
					}
				})
			)
		});
	}

	/**
	 * Builds the struct
	 *
	 * @returns {*}
	 */
	build() {
		return attemptAsync(async () => {
			this.log('Building struct:', this.data.name);
			const connect = (await this.connect()).unwrap();
			if (!connect.success) {
				this.log('Failed to connect to struct:', this.data.name);
				throw new FatalStructError(connect.message);
			}

			this.setListeners().unwrap();
		});
	}

	/**
	 * Connects to the backend struct, confirming the front end and backend types are valid
	 *
	 * @returns {*}
	 */
	connect() {
		return attemptAsync<{
			success: boolean;
			message: string;
		}>(async () => {
			this.log('Connecting to struct:', this.data.name);
			const res = await remote.connect({
				struct: this.data.name,
				structure: this.data.structure
			});
			return res;
		});
	}

	/**
	 * Gets all data as a paginated array
	 */
	all(config: ReadConfig<'pagination', T>): PaginationDataArr<T>;
	/**
	 * Gets all data as an svelte store
	 *
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	all(config: ReadConfig<'all', T>): DataArr<T>;
	/**
	 * Gets all data as a stream or svelte store
	 *
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	all(config: ReadConfig<ReadConfigType, T>) {
		if (config.type === 'pagination' && 'pagination' in config) {
			let total = 0;
			return new PaginationDataArr<T>(
				this,
				config.pagination.page,
				config.pagination.size,
				async (page, limit) => {
					const res = await remote.all({
						struct: this.data.name,
						cached: Array.from(this.cache.keys()),
						keys: config.keys || [],
						pagination: {
							page,
							limit
						}
					});
					total = res.total;
					return res.items.map((d) => this.Generator(d as any));
				},
				() => total
			);
		}

		if (!config?.force) {
			const arr = this.writables.get('all');
			if (arr) return arr;
		}

		const newArr = new DataArr(this, [...this.cache.values()]);
		this.writables.set('all', newArr);

		// Register with centralized event system using a satisfy function
		this.registerDataArray('all', newArr, (data) => {
			// All non-archived data satisfies the 'all' condition
			return !data.data.archived;
		});

		if (browser) {
			remote
				.all({
					struct: this.data.name,
					cached: Array.from(this.cache.keys()),
					keys: config.keys || []
				})
				.then((res) => {
					newArr.add(...res.items.map((d) => this.Generator(d as any)));
				});
		}

		return newArr;
	}

	/**
	 * Gets all archived data as a paginated array
	 */
	archived(config: ReadConfig<'pagination', T>): PaginationDataArr<T>;
	/**
	 * Gets all archived data
	 *
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	archived(config: ReadConfig<'all', T>): DataArr<T>;
	/**
	 * Gets all archived data
	 *
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	archived(config: ReadConfig<ReadConfigType, T>) {
		if (config.type === 'pagination' && 'pagination' in config) {
			let total = 0;
			return new PaginationDataArr<T>(
				this,
				config.pagination.page,
				config.pagination.size,
				async (page, limit) => {
					const res = await remote.archived({
						struct: this.data.name,
						cached: [],
						keys: config.keys || [],
						pagination: {
							page,
							limit
						}
					});
					total = res.total;
					return res.items.map((d) => this.Generator(d as any));
				},
				() => total
			);
		}

		if (!config?.force) {
			const arr = this.writables.get('archived');
			if (arr) return arr;
		}

		const newArr = new DataArr(
			this,
			[...this.cache.values()].filter((d) => d.data.archived)
		);
		this.writables.set('archived', newArr);

		// Register with centralized event system using a satisfy function
		this.registerDataArray(
			'archived',
			newArr,
			(data) => {
				// Only archived data satisfies the 'archived' condition
				return !!data.data.archived;
			},
			true
		); // includeArchived = true for archived data arrays

		if (browser) {
			remote
				.archived({
					struct: this.data.name,
					cached: Array.from(this.cache.keys()),
					keys: config.keys || []
				})
				.then((res) => {
					newArr.add(...res.items.map((d) => this.Generator(d as any)));
				});
		}

		return newArr;
	}

	/**
	 * Gets data from a specific id
	 *
	 * @param {string} id  Id of the data
	 * @returns {*}
	 */
	fromId(
		id: string,
		config?: {
			cache?: {
				expires: Date;
			};
			force?: boolean;
			keys?: (keyof T & keyof typeof globalCols)[];
		}
	) {
		return attemptAsync(async () => {
			if (!config?.force) {
				const has = this.cache.get(id);
				if (has) return has;
			}
			const res = await remote.fromId({
				struct: this.data.name,
				id,
				keys: config?.keys || []
			});
			return this.Generator(res as any);
		});
	}

	/**
	 * Gets data from specific ids as a paginated array
	 * @param ids
	 * @param config
	 */
	fromIds(ids: string[], config: ReadConfig<'pagination', T>): PaginationDataArr<T>;
	/**
	 * Gets data from specific ids as a svelte store
	 * @param ids
	 * @param config
	 */
	fromIds(ids: string[], config: ReadConfig<'all', T>): DataArr<T>;
	/**
	 * Gets data from specific ids as a stream or svelte store
	 * @param ids
	 * @param config
	 * @returns
	 */
	fromIds(
		ids: string[],
		config: ReadConfig<ReadConfigType, T>
	): PaginationDataArr<T> | StructStream<T> | DataArr<T> {
		if (config.type === 'pagination' && 'pagination' in config) {
			let total = 0;
			return new PaginationDataArr<T>(
				this,
				config.pagination.page,
				config.pagination.size,
				async (page, limit) => {
					const res = await remote.fromIds({
						struct: this.data.name,
						ids,
						cached: Array.from(this.cache.keys()),
						keys: config.keys || [],
						pagination: {
							page,
							limit
						}
					});
					total = res.total;
					return res.items.map((d) => this.Generator(d as any));
				},
				() => total
			);
		}

		const cacheKey = `from-ids:${ids.join(',')}`;

		if (!config?.force) {
			const arr = this.writables.get(cacheKey);
			if (arr) return arr;
		}

		const arr =
			this.writables.get(cacheKey) ||
			new DataArr(
				this,
				[...this.cache.values()].filter((d) => ids.includes(String(d.data.id)) && !d.data.archived)
			);
		this.writables.set(cacheKey, arr);

		// Register with centralized event system using a satisfy function
		this.registerDataArray(cacheKey, arr, (data) => {
			// Data satisfies if id is in the ids array and is not archived
			if (data.data.id === undefined) return false;
			return ids.includes(data.data.id) && !data.data.archived;
		});

		if (browser) {
			remote
				.fromIds({
					struct: this.data.name,
					ids,
					cached: Array.from(this.cache.keys()),
					keys: config.keys || []
				})
				.then((res) => {
					arr.add(...res.items.map((d) => this.Generator(d as any)));
				});
		}

		return arr;
	}

	/**
	 * Gets data matching a filter as a paginated array.
	 *
	 * @param {PartialStructable<T & GlobalCols>} data - Filter criteria.
	 * @param {ReadConfig<'pagination', T>} config - Pagination config.
	 */
	get(
		data: PartialStructable<T & GlobalCols>,
		config: ReadConfig<'pagination', T>
	): PaginationDataArr<T>;
	/**
	 * Gets data matching a filter as a reactive store.
	 *
	 * @param {PartialStructable<T & GlobalCols>} data - Filter criteria.
	 * @param {ReadConfig<'all', T>} config - Store config.
	 */
	get(data: PartialStructable<T & GlobalCols>, config: ReadConfig<'all', T>): DataArr<T>;
	/**
	 * Gets data matching a filter as a paginated array or reactive store.
	 *
	 * @param {PartialStructable<T & GlobalCols>} data - Filter criteria.
	 * @param {ReadConfig<ReadConfigType, T>} config - Read config.
	 */
	get(data: PartialStructable<T & GlobalCols>, config: ReadConfig<ReadConfigType, T>) {
		if (config.type === 'pagination' && 'pagination' in config) {
			let total = 0;
			return new PaginationDataArr<T>(
				this,
				config.pagination.page,
				config.pagination.size,
				async (page, limit) => {
					const res = await remote.get({
						struct: this.data.name,
						data,
						cached: Array.from(this.cache.keys()),
						keys: config.keys || [],
						pagination: {
							page,
							limit
						}
					});
					total = res.total;
					return res.items.map((d) => this.Generator(d as any));
				},
				() => total
			);
		}

		const cacheKey = `get:${JSON.stringify(data)}`;

		if (!config?.force) {
			const arr = this.writables.get(cacheKey);
			if (arr) return arr;
		}

		const arr =
			this.writables.get(cacheKey) ||
			new DataArr(
				this,
				[...this.cache.values()].filter((d) => {
					for (const [key, value] of Object.entries(data)) {
						if ((d.data as any)[key] !== value) return false;
					}
					return !d.data.archived;
				})
			);
		this.writables.set(cacheKey, arr);

		// Register with centralized event system using a satisfy function
		this.registerDataArray(cacheKey, arr, (d) => {
			for (const [key, value] of Object.entries(data)) {
				if ((d.data as any)[key] !== value) return false;
			}
			return !d.data.archived;
		});

		if (browser) {
			remote
				.get({
					struct: this.data.name,
					data,
					cached: Array.from(this.cache.keys()),
					keys: config.keys || []
				})
				.then((res) => {
					arr.add(...res.items.map((d) => this.Generator(d as any)));
				});
		}

		return arr;
	}

	/**
	 * Logs to the console
	 *
	 * @private
	 * @param {...any[]} args
	 */
	public log(...args: any[]) {
		if (this.data.log) {
			console.log(`[${this.data.name}]`, ...args);
		}
	}

	/**
	 * Creates a new DataArr instance with the given data array.d
	 * This does not cache the data, so it is not stored in the writables map.
	 *
	 * @param {?StructData<T>[]} [dataArray]
	 * @returns {DataArr<T>}
	 */
	arr(dataArray?: StructData<T>[], satisfies?: (data: StructData<T>) => boolean) {
		if (!dataArray) {
			dataArray = [];
		}

		const arr = new DataArr(this, dataArray);

		if (satisfies) {
			// Generate a unique key for this data array
			const arrKey = `arr:${Date.now()}:${Math.random()}`;

			// Register with centralized event system using the provided satisfy function
			this.registerDataArray(arrKey, arr, (data) => {
				// Use the provided satisfies function and exclude archived data by default
				return satisfies(data) && !data.data.archived;
			});
		}

		return arr;
	}

	/**
	 * Creates an empty paginated data array placeholder.
	 *
	 * @returns {PaginationDataArr<T>} Empty pagination wrapper.
	 */
	pagination() {
		return new PaginationDataArr<T>(
			this,
			0,
			10,
			async (_page, _size) => [] as StructData<T>[],
			() => 0
		);
	}

	/**
	 * Clears all data for this struct (admin only).
	 */
	clear() {
		this.log('Clearing all data from struct (admin only)');
		return remote.clear({
			struct: this.data.name
		});
	}
}
