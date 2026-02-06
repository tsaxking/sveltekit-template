/**
 * @fileoverview IndexedDB service backed by Dexie.
 *
 * Provides schema registration and initialization helpers for client-side
 * IndexedDB storage.
 *
 * @example
 * import { _define, _init } from '$lib/services/db';
 * const users = _define('users', { name: 'string' });
 * await _init();
 */
import { browser } from '$app/environment';
import Dexie from 'dexie';
import { ComplexEventEmitter } from 'ts-utils/event-emitter';

/**
 * Dexie database instance.
 */
export const DB = new Dexie(__APP_ENV__.indexed_db.db_name);

/**
 * Supported schema field types.
 */
export type SchemaFieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'date'
	| 'array'
	| 'object'
	| 'unknown';

/**
 * Maps schema field types to their runtime value types.
 */
export type SchemaFieldReturnType<T extends SchemaFieldType> = T extends 'string'
	? string
	: T extends 'number'
		? number
		: T extends 'boolean'
			? boolean
			: T extends 'date'
				? Date
				: T extends 'array'
					? unknown[]
					: T extends 'object'
						? Record<string, unknown>
						: T extends 'unknown'
							? unknown
							: never;

/**
 * Schema definition mapping field names to types.
 */
export type SchemaDefinition = {
	[key: string]: SchemaFieldType;
};

let initialized = false;

const pendingSchemas: { [tableName: string]: string } = {};

const globals: SchemaDefinition = {
	id: 'string',
	created_at: 'date',
	updated_at: 'date'
};

/**
 * Typed table record for a schema definition.
 */
export type TableStructable<T extends SchemaDefinition> = {
	[K in keyof T]: SchemaFieldReturnType<T[K]>;
} & {
	id: string;
	created_at: Date;
	updated_at: Date;
};

/**
 * Defines a table schema before initialization.
 *
 * @param {string} name - Table name.
 * @param {T} schema - Schema definition.
 */
export const _define = <T extends SchemaDefinition>(name: string, schema: T) => {
	if (initialized) throw new Error(`Can't define table "${name}" after initDB()`);
	pendingSchemas[name] = Object.keys({
		...globals,
		...schema
	}).join(', ');
	return () =>
		DB.table<
			{
				[K in keyof T]: SchemaFieldReturnType<T[K]>;
			} & {
				id: string;
				created_at: Date;
				updated_at: Date;
			}
		>(name);
};

/**
 * Initializes the IndexedDB database with registered schemas.
 */
export const _init = async () => {
	if (!browser) return DB;
	if (initialized) return DB;
	if (!__APP_ENV__.indexed_db.enabled) {
		if (__APP_ENV__.indexed_db.debug) {
			console.warn('IndexedDB is disabled in the configuration.');
		}
		return;
	}
	if (__APP_ENV__.indexed_db.debug) {
		console.info('Initializing IndexedDB...');
	}
	DB.version(__APP_ENV__.indexed_db.version).stores(pendingSchemas);
	await DB.open();
	initialized = true;
	em.emit('init');
	return DB;
};

/**
 * Emits lifecycle events for IndexedDB.
 */
export const em = new ComplexEventEmitter<{
	init: void;
}>();
