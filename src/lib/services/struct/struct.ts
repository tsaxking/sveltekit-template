/* eslint-disable @typescript-eslint/no-explicit-any */
import { attempt, attemptAsync } from 'ts-utils/check';
import { ComplexEventEmitter } from 'ts-utils/event-emitter';
import { match } from 'ts-utils/match';
import { Stream } from 'ts-utils/stream';
import { type Writable } from 'svelte/store';
import { type ColType, DataAction, PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { StructDataVersion } from './data-version';
import { saveStructUpdate, deleteStructUpdate } from './batching';
import { StructData } from './struct-data';
import { StructDataStage } from './data-staging';
import { DataArr } from './data-arr';

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
	Update = 'update',
	/**
	 * Run a custom function on the back end
	 */
	Call = 'call',
	/**
	 * Custom query, this is used if a specific read type doesn't fulfill your needs.
	 */
	Query = 'query'
	// Retrieve = 'retrieve',
}

// TODO: Batching?

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

type ISOString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

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
 * Sets up a batch test mode. This should only be set to true in a testing environment. Otherwise no data will be sent
 *
 * @type {boolean}
 */
let BATCH_TEST = false;

/**
 * Initializes the batch test mode, this will not send any data to the server. This is used for testing purposes only.
 *
 * @returns {true}
 */
export const startBatchTest = (): true => {
	return (BATCH_TEST = true);
};

/**
 * Ends the batch test mode, this will not send any data to the server. This is used for testing purposes only.
 *
 * @returns {false}
 */
export const endBatchTest = (): false => {
	return (BATCH_TEST = false);
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
 * @implements {Writable<StructData<T>>}
 */
export class SingleWritable<T extends Blank> implements Writable<StructData<T>> {
	/**
	 * The current data held by this writable store.
	 *
	 * @private
	 * @type {StructData<T>}
	 */
	private data: StructData<T>;

	/**
	 * Creates an instance of SingleWritable.
	 *
	 * @constructor
	 * @param {StructData<T>} defaultData
	 */
	constructor(defaultData: StructData<T>) {
		this.data = defaultData;
	}
	/**
	 * Runs when all subscribers have been removed
	 *
	 * @private
	 * @type {?() => void}
	 */
	private _onAllUnsubscribe?: () => void;
	/**
	 *  A set of subscribers that will be notified when the data changes.
	 *
	 * @private
	 * @readonly
	 * @type {*}
	 */
	private readonly subscribers = new Set<(data: StructData<T>) => void>();

	/**
	 * Subscribes to changes in the data.
	 *
	 * @param {(data: StructData<T>) => void} fn
	 * @returns {void) => () => void}
	 */
	subscribe(fn: (data: StructData<T>) => void) {
		this.subscribers.add(fn);
		fn(this.data);
		return () => {
			this.subscribers.delete(fn);
			if (!this.subscribers.size) this._onAllUnsubscribe?.();
		};
	}

	/**
	 * Sets a callback that runs when all subscribers have unsubscribed.
	 *
	 * @param {() => void} fn
	 * @returns {void) => void}
	 */
	onAllUnsubscribe(fn: () => void) {
		this._onAllUnsubscribe = fn;
	}

	/**
	 * Sets the data to a new value and notifies all subscribers.
	 *
	 * @param {StructData<T>} data
	 */
	set(data: StructData<T>) {
		this.data = data;
		this.subscribers.forEach((fn) => fn(data));
	}

	/**
	 * Updates the data using a function that receives the current data.
	 *
	 * @param {(data: StructData<T>) => StructData<T>} fn
	 * @returns {StructData<T>) => void}
	 */
	update(fn: (data: StructData<T>) => StructData<T>) {
		this.set(fn(this.data));
	}

	/**
	 * Returns the current data held by this writable store.
	 *
	 * @returns {StructData<T>}
	 */
	get() {
		return this.data;
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
 * All read types that can be used to query data
 *
 * @typedef {ReadTypes}
 */
type ReadTypes = {
	all: void;
	archived: void;
	property: {
		key: string;
		value: unknown;
	};
	universe: string;
	custom: {
		query: string;
		data: unknown;
	};
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
			return z
				.object({
					success: z.boolean(),
					message: z.string().optional()
				})
				.parse(
					await this.post(DataAction.Create, {
						data,
						attributes
					}).then((r) => r.unwrap().json())
				);
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
	 * Sets listeners for the struct. Runs when the struct is built
	 *
	 * @private
	 * @returns {*}
	 */
	private setListeners() {
		return attempt(() => {
			this.data.socket.on(`struct:${this.data.name}`, (data) => {
				this.log('Event Data:', data);
				if (typeof data !== 'object' || data === null) {
					return console.error('Invalid data:', data);
				}
				if (!Object.hasOwn(data, 'event')) {
					return console.error('Invalid event:', data);
				}
				if (!Object.hasOwn(data, 'data')) {
					return console.error('Invalid data:', data);
				}
				const { event, data: structData } = data as {
					event: 'create' | 'update' | 'archive' | 'delete' | 'restore';
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

		const res = this.getZodSchema().safeParse(assembled);
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
	Stage(data: StructData<T & GlobalCols>) {
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
	 * Sends a post request to the server
	 *
	 * @param {(DataAction | PropertyAction)} action
	 * @param {unknown} data
	 * @returns {*}
	 */
	post(action: DataAction | PropertyAction | string, data: unknown, date?: Date) {
		return attemptAsync(async () => {
			if (!this.data.browser)
				throw new StructError(
					'Currently not in a browser environment. Will not run a fetch request'
				);
			const id = uuid();
			if (
				![
					PropertyAction.Read,
					PropertyAction.ReadArchive,
					PropertyAction.ReadVersionHistory
				].includes(action as PropertyAction) &&
				action !== `${PropertyAction.Read}/custom` &&
				!action.startsWith('custom')
			) {
				// this is an update, so set up batch updating
				saveStructUpdate({
					struct: this.data.name,
					data,
					id,
					type: action
				}).unwrap();
			}
			if (BATCH_TEST) {
				throw new Error('Batch test is enabled, will not run a fetch request');
			}
			const res = await fetch(`/struct/${this.data.name}/${action}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...Object.fromEntries(Struct.headers.entries()),
					'X-Date': String(date?.getTime() || Struct.getDate())
				},
				body: JSON.stringify(data)
			});

			if (res.ok) {
				deleteStructUpdate(id).unwrap();
			}

			this.log('Post:', action, data, res);
			return res;
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
			const res = z
				.object({
					success: z.boolean(),
					message: z.string()
				})
				.parse(
					await fetch(`/struct/${this.data.name}/connect`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							structure: this.data.structure
						})
					}).then((r) => r.json())
				);
			if (!res.success) {
				throw new FatalStructError(res.message);
			}
			return res;
		});
	}

	/**
	 * Retrieves a stream of data from the server, used for querying data
	 *
	 * @private
	 * @template {keyof ReadTypes} K
	 * @param {K} type
	 * @param {ReadTypes[K]} args
	 * @returns {StructStream<T>}
	 */
	public getStream<K extends keyof ReadTypes>(type: K, args: ReadTypes[K]): StructStream<T> {
		this.log('Stream:', type, args);
		const s = new StructStream(this);
		this.post(`${PropertyAction.Read}/${type}`, { args }).then((res) => {
			const response = res.unwrap();
			this.log('Stream Result:', response);

			// if (response.headers.get('Content-Type') === 'application/json') {
			return setTimeout(async () => {
				this.log('Recieved Streamable JSON');
				const data = await response.json();
				this.log('Stream Data:', data);
				const parsed = z
					.object({
						success: z.boolean(),
						data: z.array(z.unknown()).optional(),
						message: z.string().optional()
					})
					.parse(data);
				if (!parsed.success) {
					this.log('Stream Error:', parsed);
					return s.end();
				}
				if (parsed.data) {
					for (const d of parsed.data) {
						s.add(this.Generator(d as any));
					}
					s.end();
				}
			});
			// }

			// const reader = response.body?.getReader();
			// if (!reader) {
			// 	return;
			// }

			// this.log('Stream Reader:', reader);

			// let buffer = '';

			// reader.read().then(({ done, value }) => {
			// 	this.log('Stream Read:', done, value);
			// 	const text = new TextDecoder().decode(value);
			// 	let chunks = text.split('\n\n');
			// 	this.log('Stream Chunks:', ...chunks);

			// 	if (buffer) {
			// 		chunks[0] = buffer + chunks[0];
			// 		buffer = '';
			// 	}

			// 	if (!text.endsWith('\n\n')) {
			// 		buffer = chunks.pop() || '';
			// 	}

			// 	chunks = chunks.filter((i) => {
			// 		if (i === 'end') done = true;
			// 		try {
			// 			JSON.parse(i);
			// 			return true;
			// 		} catch {
			// 			return false;
			// 		}
			// 	});

			// 	for (const chunk of chunks) {
			// 		try {
			// 			const data = JSON.parse(decode(chunk));
			// 			this.log('Stream Data:', data);
			// 			s.add(this.Generator(data));
			// 		} catch (error) {
			// 			console.error('Invalid JSON:', chunk);
			// 		}
			// 	}

			// 	if (done) {
			// 		this.log('Stream Done');
			// 		s.end();
			// 	}
			// });
		});
		return s;
	}

	/**
	 * Gets all data as a stream
	 *
	 * @param {true} asStream If true, returns a stream
	 * @returns {StructStream<T>}
	 */
	all(asStream: true): StructStream<T>;
	/**
	 * Gets all data as an svelte store
	 *
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	all(asStream: false): DataArr<T>;
	/**
	 * Gets all data as a stream or svelte store
	 *
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	all(asStream: boolean) {
		const getStream = () => this.getStream('all', undefined);
		if (asStream) return getStream();
		const arr = this.writables.get('all');
		if (arr) return arr;
		const newArr = new DataArr(this, [...this.cache.values()]);
		this.writables.set('all', newArr);

		const add = (d: StructData<T>) => {
			newArr.add(d);
		};
		const remove = (d: StructData<T>) => {
			newArr.remove(d);
		};
		const update = (d: StructData<T>) => {
			newArr.inform();
		};
		this.on('new', add);
		this.on('delete', remove);
		this.on('archive', remove);
		this.on('restore', add);
		this.on('update', update);

		const stream = getStream();
		stream.once('data', (data) => newArr.set([data]));
		stream.pipe(add);
		newArr.onAllUnsubscribe(() => {
			this.off('new', add);
			this.off('delete', remove);
			this.off('archive', remove);
			this.off('restore', add);
			this.off('update', update);
			this.writables.delete('all');
		});
		return newArr;
	}

	/**
	 * Gets all archived data
	 *
	 * @param {true} asStream If true, returns a stream
	 * @returns {StructStream<T>}
	 */
	archived(asStream: true): StructStream<T>;
	/**
	 * Gets all archived data
	 *
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	archived(asStream: false): DataArr<T>;
	/**
	 * Gets all archived data
	 *
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	archived(asStream: boolean) {
		const getStream = () => this.getStream('archived', undefined);
		if (asStream) return getStream();
		const arr = this.writables.get('archived');
		if (arr) return arr;
		const newArr = new DataArr(
			this,
			[...this.cache.values()].filter((d) => d.data.archived)
		);
		this.writables.set('archived', newArr);

		const add = (d: StructData<T>) => {
			newArr.add(d);
		};
		const remove = (d: StructData<T>) => {
			newArr.remove(d);
		};
		const update = (d: StructData<T>) => {
			newArr.inform();
		};
		this.on('delete', remove);
		this.on('archive', add);
		this.on('restore', remove);
		this.on('update', update);

		const stream = getStream();
		stream.once('data', (data) => newArr.set([data]));
		stream.pipe(add);

		newArr.onAllUnsubscribe(() => {
			this.off('delete', remove);
			this.off('archive', add);
			this.off('restore', remove);
			this.off('update', update);
			this.writables.delete('archived');
		});

		return newArr;
	}

	/**
	 * Gets all data with a specific property value
	 *
	 * @param {string} key Property key
	 * @param {unknown} value Property value
	 * @param {true} asStream If true, returns a stream
	 * @returns {StructStream<T>}
	 */
	fromProperty<K extends keyof (T & GlobalCols)>(
		key: K,
		value: ColTsType<(T & GlobalCols)[K]>,
		asStream: true
	): StructStream<T>;
	/**
	 * Gets all data with a specific property value
	 *
	 * @param {string} key Property key
	 * @param {unknown} value Property value
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	fromProperty<K extends keyof (T & GlobalCols)>(
		key: K,
		value: ColTsType<(T & GlobalCols)[K]>,
		asStream: false
	): DataArr<T>;
	/**
	 * Gets all data with a specific property value
	 *
	 * @param {string} key Property key
	 * @param {unknown} value Property value
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	fromProperty<K extends keyof (T & GlobalCols)>(
		key: K,
		value: ColTsType<(T & GlobalCols)[K]>,
		asStream: boolean
	) {
		const getStream = () => this.getStream('property', { key: String(key), value });
		if (asStream) return getStream();
		const arr =
			this.writables.get(`property:${String(key)}:${JSON.stringify(value)}`) ||
			new DataArr(
				this,
				[...this.cache.values()].filter((d) => d.data[key] === value)
			);
		this.writables.set(`property:${String(key)}:${JSON.stringify(value)}`, arr);

		const add = (d: StructData<T>) => {
			if ((d.data as any)[key] === value) arr.add(d);
		};
		const remove = (d: StructData<T>) => {
			arr.remove(d);
		};
		const update = (d: StructData<T>) => {
			if ((d.data as any)[key] === value && !arr.data.includes(d)) {
				arr.add(d);
			} else if ((d.data as any)[key] !== value) {
				arr.remove(d);
			} else {
				arr.inform();
			}
		};

		this.on('new', add);
		this.on('archive', remove);
		this.on('restore', add);
		this.on('delete', remove);
		this.on('update', update);

		const stream = getStream();
		stream.once('data', (data) => arr.set([data]));
		stream.pipe(add);

		arr.onAllUnsubscribe(() => {
			this.off('new', add);
			this.off('archive', remove);
			this.off('restore', add);
			this.off('delete', remove);
			this.off('update', update);
			this.writables.delete(`property:${String(key)}:${JSON.stringify(value)}`);
		});
		return arr;
	}

	/**
	 * Gets all data in a specific universe
	 *
	 * @param {string} universe Universe id
	 * @param {true} asStream If true, returns a stream
	 * @returns {StructStream<T>}
	 */
	fromUniverse(universe: string, asStream: true): StructStream<T>;
	/**
	 * Gets all data in a specific universe
	 *
	 * @param {string} universe Universe id
	 * @param {false} asStream If false, returns a svelte store
	 * @returns {DataArr<T>}
	 */
	fromUniverse(universe: string, asStream: false): DataArr<T>;
	/**
	 * Gets all data in a specific universe
	 *
	 * @param {string} universe Universe id
	 * @param {boolean} asStream Returns a stream if true, svelte store if false
	 * @returns
	 */
	fromUniverse(universe: string, asStream: boolean) {
		const getStream = () => this.getStream('universe', universe);
		if (asStream) return getStream();
		const arr =
			this.writables.get(`universe:${universe}`) ||
			new DataArr(
				this,
				[...this.cache.values()].filter((d) => d.data.universe === universe)
			);
		this.writables.set(`universe:${universe}`, arr);

		const add = (d: StructData<T>) => {
			// TODO: Check if this data is in the universe
			arr.add(d);
		};

		const remove = (d: StructData<T>) => {
			arr.remove(d);
		};

		const update = (d: StructData<T>) => {
			arr.inform();
		};

		this.on('new', add);
		this.on('archive', remove);
		this.on('restore', add);
		this.on('delete', remove);
		this.on('update', update);

		const stream = getStream();
		stream.once('data', (data) => arr.set([data]));
		stream.pipe(add);

		arr.onAllUnsubscribe(() => {
			this.off('new', add);
			this.off('archive', remove);
			this.off('restore', add);
			this.off('delete', remove);
			this.off('update', update);
			this.writables.delete(`universe:${universe}`);
		});
		return arr;
	}

	/**
	 * Gets data from a specific id
	 *
	 * @param {string} id  Id of the data
	 * @returns {*}
	 */
	fromId(id: string) {
		return attemptAsync(async () => {
			const has = this.cache.get(id);
			if (has) return has;
			const res = await this.post(`${PropertyAction.Read}/from-id`, {
				id
			});
			const data = await res.unwrap().json();
			return this.Generator(data as SafePartialStructable<T & GlobalCols>);
		});
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
	 * Sends a custom query to the server and returns the results.
	 *
	 * @param {string} query
	 * @param {unknown} data
	 * @param {{
	 * 			asStream: true;
	 * 		}} config
	 * @returns {StructStream<T>}
	 */
	query(
		query: string,
		data: unknown,
		config: {
			asStream: true;
		}
	): StructStream<T>;
	/**
	 * Sends a custom query to the server and returns the results.
	 *
	 * @param {string} query
	 * @param {unknown} data
	 * @param {{
	 * 			asStream: false;
	 * 			satisfies: (data: StructData<T>) => boolean;
	 * 			includeArchive?: boolean; // default is falsy
	 * 		}} config
	 * @returns {DataArr<T>}
	 */
	query(
		query: string,
		data: unknown,
		config: {
			asStream: false;
			satisfies: (data: StructData<T>) => boolean;
			includeArchive?: boolean; // default is falsy
		}
	): DataArr<T>;
	/**
	 * Sends a custom query to the server and returns the results.
	 *
	 * @param {string} query
	 * @param {unknown} data
	 * @param {{
	 * 			asStream: boolean;
	 * 			satisfies?: (data: StructData<T>) => boolean;
	 * 			includeArchive?: boolean;
	 * 		}} config
	 * @returns {boolean; includeArchive?: boolean; }): DataArr<...>; }}
	 */
	query(
		query: string,
		data: unknown,
		config: {
			asStream: boolean;
			satisfies?: (data: StructData<T>) => boolean;
			includeArchive?: boolean;
		}
	) {
		const get = () => {
			return this.getStream('custom', {
				query,
				data
			});
		};
		if (config.asStream) return get();
		const exists = this.writables.get(`custom:${query}:${JSON.stringify(data)}`);
		if (exists) return exists;

		const arr = new DataArr(
			this,
			[...this.cache.values()].filter((d) => config.satisfies?.(d) || false)
		);

		const add = (d: StructData<T>) => {
			if (config.satisfies?.(d)) {
				arr.add(d);
			}
		};

		const remove = (d: StructData<T>) => {
			// if (config.satisfies?.(d)) {
			arr.remove(d);
			// }
		};

		const update = (d: StructData<T>) => {
			if (config.satisfies?.(d)) {
				if (!arr.data.includes(d)) {
					this.log('Adding data to custom query:', d.data);
					arr.add(d);
				} else {
					this.log('Updating data in custom query:', d.data);
					arr.inform();
				}
			} else {
				this.log('Removing data from custom query:', d.data);
				arr.remove(d);
			}
		};

		this.on('new', add);
		if (!config.includeArchive) this.on('restore', add);
		this.on('archive', remove);
		if (!config.includeArchive) this.on('delete', remove);
		const res = get();
		res.once('data', (d) => arr.set([d]));
		res.pipe((d) => arr.add(d));
		this.on('update', update);

		arr.onAllUnsubscribe(() => {
			this.writables.delete(`custom:${query}:${JSON.stringify(data)}`);

			this.off('new', add);
			this.off('restore', add);
			this.off('archive', remove);
			this.off('delete', remove);
			this.off('update', update);
		});

		return arr;
	}

	/**
	 * Sends custom data to the server and returns the result.
	 *
	 * @template T
	 * @param {string} name
	 * @param {unknown} data
	 * @param {z.ZodType<T>} returnType
	 * @returns {*}
	 */
	send<T>(name: string, data: unknown, returnType: z.ZodType<T>) {
		return attemptAsync<T>(async () => {
			const res = await this.post(`custom/${name}`, data).then((r) => r.unwrap().json());
			const parsed = z
				.object({
					success: z.boolean(),
					data: z.unknown(),
					message: z.string().optional()
				})
				.parse(res);
			if (!parsed.success) {
				throw new DataError(parsed.message || 'Failed to send data');
			}
			if (!parsed.data) {
				throw new DataError('No data returned');
			}
			return returnType.parse(parsed.data);
		});
	}

	// custom functions
	/**
	 * Calls a custom event on the server and returns the result.
	 *
	 * @param {string} event
	 * @param {unknown} data
	 * @returns {*}
	 */
	call(event: string, data: unknown) {
		return attemptAsync(async () => {
			const res = await (await this.post(`call/${event}`, data)).unwrap().json();

			return z
				.object({
					success: z.boolean(),
					message: z.string().optional(),
					data: z.unknown().optional()
				})
				.parse(res);
		});
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
			const add = (d: StructData<T>) => {
				if (satisfies(d)) {
					arr.add(d);
				}
			};
			const remove = (d: StructData<T>) => {
				arr.remove(d);
			};
			const update = (d: StructData<T>) => {
				if (satisfies(d)) {
					if (!arr.data.includes(d)) {
						arr.add(d);
					} else {
						arr.inform();
					}
				} else {
					arr.remove(d);
				}
			};

			this.on('new', add);
			this.on('archive', remove);
			this.on('restore', add);
			this.on('delete', remove);
			this.on('update', update);

			arr.onAllUnsubscribe(() => {
				this.off('new', add);
				this.off('archive', remove);
				this.off('restore', add);
				this.off('delete', remove);
				this.off('update', update);
			});
		}

		return arr;
	}
}
