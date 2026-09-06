/**
 * @fileoverview
 * Typed Supabase data access helpers with reactive caching, realtime synchronization,
 * query composition, and pagination utilities for Svelte 5 runes-based state.
 *
 * This module is the core data access layer for the app. It combines three ideas:
 * - table-aware typed wrappers (`SupaStruct`) for schema validation and Supabase interaction
 * - reactive, cache-aware query objects (`SupaQuery`) that can hydrate from Dexie, hit Supabase,
 *   and resolve fast from the in-memory cache
 * - row-level helpers (`SupaStructData`) for updating, deleting, and reacting to live data
 *
 * The goal is to keep business logic ergonomic: you create a table struct once, run typed
 * queries against it, and receive `SupaStructData` records that behave like in-memory row models
 * while still being backed by the database.
 *
 * @example
 * const users = SupaStruct.get({
 *   schema: 'core',
 *   table: 'users',
 *   client: supabase,
 *   debug: true
 * });
 *
 * const activeUsers = users.get({ archived: false });
 * const first = await activeUsers.first();
 *
 * @see {@link SupaStruct}
 * @see {@link SupaQuery}
 * @see {@link SupaPagination}
 * @see {@link SupaStructData}
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import supabase from "$lib/services/supabase";
import { attempt, attemptAsync, type Result, Ok, Err, debounce } from 'ts-utils';
import { type SupabaseClient } from '@supabase/supabase-js';
import { schemas } from '$lib/types/supabase-zod';
import { z } from 'zod';
import { type Database, type DatabasePivoted, type SchemaName } from '$lib/types/supabase';
import { SvelteMap, SvelteDate, SvelteSet } from 'svelte/reactivity';
import { browser } from '$app/env';
import { DexieTable } from '$lib/services/db/table';
import { is_online, on_network_change } from '$lib/utils/online.svelte';
import { stable_stringify } from '$lib/utils/json';
import { postgresChangesFilter } from '@supabase/supabase-js';
/**
 * Typed Supabase client for this app with a `serviceRole` flag used for privileged server-side work.
 */
export type Client = SupabaseClient<Database> & { serviceRole: boolean };

/** Schema names that have generated row metadata. */
export type RowSchemaName = keyof DatabasePivoted['Row'];
/** Schema names that have generated insert metadata. */
export type InsertSchemaName = keyof DatabasePivoted['Insert'];
/** Schema names that have generated update metadata. */
export type UpdateSchemaName = keyof DatabasePivoted['Update'];

/**
 * Table names available in a specific row schema.
 *
 * @template S - Schema whose row tables are being queried.
 */
export type RowTableName<S extends RowSchemaName> = keyof DatabasePivoted['Row'][S];
/**
 * Table names available for insert payloads in a specific schema.
 *
 * @template S - Schema whose insert tables are being queried.
 */
export type InsertTableName<S extends InsertSchemaName> = keyof DatabasePivoted['Insert'][S];
/**
 * Table names available for update payloads in a specific schema.
 *
 * @template S - Schema whose update tables are being queried.
 */
export type UpdateTableName<S extends UpdateSchemaName> = keyof DatabasePivoted['Update'][S];

/**
 * Generic row table names for a schema.
 *
 * @template Schema - Database schema to inspect.
 */
export type RowTableNames<Schema extends SchemaName = SchemaName> = RowTableName<Schema>;
/**
 * Generic insert table names for a schema.
 *
 * @template Schema - Database schema to inspect.
 */
export type InsertTableNames<Schema extends SchemaName = SchemaName> = InsertTableName<Schema>;
/**
 * Generic update table names for a schema.
 *
 * @template Schema - Database schema to inspect.
 */
export type UpdateTableNames<Schema extends SchemaName = SchemaName> = UpdateTableName<Schema>;

/**
 * Full typed row shape for a table, including metadata fields added by the schema.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 */
export type Row<
	Schema extends SchemaName,
	Name extends RowTableNames<Schema>
> = DatabasePivoted['Row'][Schema][Name] & {
	id: string;
	created_at: string;
	archived: boolean;
};

/**
 * Typed row shape without the `archived` flag, useful for read and compare operations.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 */
export type RowWithoutArchived<
	Schema extends SchemaName,
	Name extends RowTableNames<Schema>
> = Omit<Row<Schema, Name>, 'archived'>;

/**
 * Typed insert payload for a table.
 *
 * @template Schema - Active database schema.
 * @template Name - Insert table variant.
 */
export type Insert<
	Schema extends SchemaName,
	Name extends InsertTableNames<Schema>
> = DatabasePivoted['Insert'][Schema][Name];

/**
 * Insert payload without the `archived` field.
 *
 * @template Schema - Active database schema.
 * @template Name - Insert table variant.
 */
export type InsertWithoutArchived<
	Schema extends SchemaName,
	Name extends InsertTableNames<Schema>
> = Omit<Insert<Schema, Name>, 'archived'>;

/**
 * Typed update payload for a table.
 *
 * @template Schema - Active database schema.
 * @template Name - Update table variant.
 */
export type Update<
	Schema extends SchemaName,
	Name extends UpdateTableNames<Schema>
> = DatabasePivoted['Update'][Schema][Name] & {
	archived?: boolean;
};

/**
 * Update payload with common system fields removed.
 *
 * @template Schema - Active database schema.
 * @template Name - Update table variant.
 */
export type UpdateWithoutArchived<
	Schema extends SchemaName,
	Name extends UpdateTableNames<Schema>
> = Omit<Update<Schema, Name>, 'archived' | 'id' | 'created_at'>;

/**
 * Partial row object that guarantees a subset of required fields while allowing other values to be missing.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 * @template RequiredFields - Fields that must be present in the partial object.
 */
export type PartialRow<
	Schema extends SchemaName,
	Name extends RowTableNames<Schema>,
	RequiredFields extends keyof RowWithoutArchived<Schema, Name> = keyof RowWithoutArchived<
		Schema,
		Name
	>
> = Partial<RowWithoutArchived<Schema, Name>> & {
	[K in RequiredFields]: RowWithoutArchived<Schema, Name>[K];
};

/**
 * Table metadata and row contract for a table in the active Supabase schema.
 *
 * @template Name - Table name from the generated database type.
 */
export type Table<
	Schema extends SchemaName,
	Name extends keyof Database[Schema]['Tables']
> = Database[Schema]['Tables'][Name];

/**
 * Runtime configuration object passed to a struct instance.
 *
 * @template Schema - Active database schema.
 * @template Name - Table handled by the struct.
 */
export type SupaConfig<Schema extends RowSchemaName, Name extends RowTableNames<Schema>> = {
	/**
	 * Table name in the active schema.
	 */
	table: Name;
	/**
	 * Supabase client used for networking, realtime events, and offline replay.
	 */
	client: Client;
	/**
	 * Active database schema for the table.
	 */
	schema: Schema;
	/**
	 * Enables debug logging scoped to this struct instance.
	 */
	debug?: boolean;
	/**
	 * Enables IndexedDB-backed local persistence for this struct.
	 */
	index_db?: boolean;
	/**
	 * Controls whether the struct is registered in the shared in-memory registry.
	 *
	 * Defaults to `true` when not explicitly disabled.
	 */
	do_set?: boolean;
};

/**
 * A readonly list of required row properties.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 */
export type RequiredList<
	Schema extends RowSchemaName,
	Name extends RowTableNames<Schema>
> = readonly (keyof Row<Schema, Name>)[];

/**
 * Resolves the actual required fields for a query projection.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 * @template Required - Requested field list, if any.
 */
export type ResolveRequiredFields<
	Schema extends RowSchemaName,
	Name extends RowTableNames<Schema>,
	Required extends RequiredList<Schema, Name> | undefined
> = Required extends readonly (infer K)[]
	? Extract<K, keyof Row<Schema, Name>> | 'id'
	: keyof Row<Schema, Name>;

/**
 * Type-level guard that ensures a field set includes a required subset.
 */
export type HasAtLeastRequiredFields<Have extends PropertyKey, Need extends PropertyKey> = [
	Need
] extends [Have]
	? true
	: false;

/**
 * Type-level helper that narrows a field set to a valid required subset.
 */
export type EnsureHasAtLeastRequiredFields<Have extends PropertyKey, Need extends PropertyKey> = [
	Need
] extends [Have]
	? Have
	: never;

/**
 * Fetch read options for a single query.
 *
 * @template Schema - Active database schema.
 * @template Name - Table within that schema.
 * @template Required - Field projection type.
 */
export type ReadConfig<
	Schema extends RowSchemaName,
	Name extends RowTableNames<Schema>,
	Required extends keyof RowWithoutArchived<Schema, Name> = keyof RowWithoutArchived<Schema, Name>
> = {
	/**
	 * Explicit field projection to include in the read result.
	 *
	 * If omitted, the query loads the table's default required fields.
	 */
	only?: readonly Required[];
};

/**
 * Normalized error codes emitted by the Supabase layer.
 */
export type SupaErrorCode =
	| 'invalid data'
	| 'no schema'
	| 'no table'
	| 'unauthorized'
	| 'unknown'
	| 'network'
	| 'timeout'
	| 'offline'
	| 'no dexie';

/**
 * Structured error wrapper for Supabase failures.
 *
 * @extends Error
 * @example
 * throw new SupaError('unauthorized', 'The current user cannot read this table');
 */
class SupaError extends Error {
	/**
	 * Error code describing the failure classification.
	 */
	constructor(
		public readonly code: SupaErrorCode,
		message?: string
	) {
		super(message ?? `SupaStruct query error: ${code}`);
	}
}

/**
 * IndexedDB queue used to persist offline write actions until connectivity is restored.
 */
const OfflineUpdates = new DexieTable({
	name: 'offline_updates',
	schema: z.object({
		action: z.enum(['insert', 'update', 'delete', 'upsert']),
		data: z.record(z.any()),
		schema: z.string(),
		table: z.string(),
		target_id: z.string().optional()
	})
});

/**
 * Increment when the serialized query cache format changes.
 */
const QUERY_CACHE_VERSION = 1;
/**
 * IndexedDB table storing query sync metadata for TTL-based refresh behavior.
 */
const QueryCache = new DexieTable({
	name: 'queries',
	schema: z.object({
		query: z.string(),
		schema: z.string(),
		table: z.string(),
		version: z.number(),
		required: z.string(),
		last_sync: z.number()
	})
});

/**
 * Global guard to avoid registering duplicate offline listeners.
 */
let offline_setup = false;

/**
 * Initializes the offline queue replay listener for this Supabase client.
 *
 * When connectivity returns, the app replays queued local insert/update/delete operations
 * stored in IndexedDB so the server state and the local cache converge.
 *
 * @param {Client} client - Supabase client used to replay queued actions.
 * @returns {() => void} Cleanup callback that disables the listener.
 */
export const setup_network_listener = (client: Client) => {
	SupaStruct.structs.values().next().value?.log('Setting up offline network listener');
	if (offline_setup)
		return () => {
			SupaStruct.structs.values().next().value?.log('Offline network listener already set up');
			offline_setup = false;
		};
	offline_setup = true;
	const off = on_network_change(async (online) => {
		SupaStruct.structs.values().next().value?.log('Network status changed', { online });
		if (!online) return;
		const updates = await OfflineUpdates.all();

		if (updates.isErr()) {
			SupaStruct.structs
				.values()
				.next()
				.value?.log('Failed to load offline updates', updates.error);
			return;
		}
		SupaStruct.structs.values().next().value?.log('Loaded offline updates', {
			count: updates.value.length
		});

		for (const update of updates.value.slice()) {
			const struct = SupaStruct.get({
				client,
				schema: update.raw.schema as RowSchemaName,
				table: update.raw.table as RowTableNames<RowSchemaName>
			});
			if (update.raw.action === 'insert') {
				if (!Array.isArray(update.raw.data)) {
					struct.log('Offline insert data is not an array', update.raw);
					await update.delete();
					continue;
				}
				const result = await struct.new(...(update.raw.data as never[]));
				if (result.isErr()) {
					struct.log('Failed to process offline insert', result.error);
					continue;
				} else {
					struct.log('Processed offline insert update');
					await update.delete();
					continue;
				}
			}

			if (update.raw.action === 'upsert') {
				if (!Array.isArray(update.raw.data)) {
					struct.log('Offline upsert data is not an array', update.raw);
					await update.delete();
					continue;
				}
				const result = await struct.upsert(update.raw.data as never[]);
				if (result.isErr()) {
					struct.log('Failed to process offline upsert', result.error);
					continue;
				} else {
					struct.log('Processed offline upsert update');
					await update.delete();
					continue;
				}
			}

			if (!('id' in update.raw.data)) {
				struct.log('Offline update missing id field', update.raw);
				await update.delete();
				continue;
			}

			const data = await struct.fromId(update.raw.data.id as string);
			if (data.isErr()) {
				struct.log('Failed to load existing row for offline update', data.error);
				continue;
			}

			if (!data.value) {
				struct.log('Offline update could not find existing row', update.raw);
				await update.delete();
				continue;
			}

			if (update.raw.action === 'update') {
				const result = await data.value.update(update.raw.data as never);
				if (result.isErr()) {
					struct.log('Failed to process offline update', result.error);
					continue;
				} else {
					struct.log('Processed offline update action');
					await update.delete();
					continue;
				}
			}
			if (update.raw.action === 'delete') {
				const result = await data.value.delete();
				if (result.isErr()) {
					struct.log('Failed to process offline delete', result.error);
					continue;
				} else {
					struct.log('Processed offline delete action');
					await update.delete();
					continue;
				}
			}
		}
	});
	return () => {
		SupaStruct.structs.values().next().value?.log('Tearing down offline network listener');
		off();
		offline_setup = false;
	};
};

/**
 * Supported field comparison operators for the legacy realtime filter syntax.
 */
type Condition = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike';

/**
 * PostgREST filter template used by realtime subscriptions.
 *
 * @template S - Active schema.
 * @template T - Target table within the schema.
 */
type Filter<S extends RowSchemaName, T extends RowTableNames<S>> =
	| `${Extract<keyof Row<S, T>, string>}=${Condition}.${string}`
	| `${Extract<keyof Row<S, T>, string>}=in.(${string})`
	| '*';

type RealtimeCallback<Schema extends RowSchemaName, Table extends RowTableNames<Schema>> = (
	data: SupaStructData<Schema, Table>,
	event: 'INSERT' | 'DELETE' | 'UPDATE',
	old?: Row<Schema, Table>
) => void;

/**
 * Realtime subscription descriptor for channel registration.
 *
 * @template S - Active schema.
 * @template T - Target table within the schema.
 */
type Subscription<S extends RowSchemaName, T extends RowTableNames<S>> = {
	/**
	 * Realtime filter string or wildcard selector.
	 */
	filter: Filter<S, T> | string;
	/**
	 * Callback executed whenever a matching payload arrives.
	 */
	callback?: RealtimeCallback<S, T>;
	/**
	 * Struct associated with the subscription target table.
	 */
	struct: SupaStruct<S, T>;
};

/**
 * Active subscriptions keyed by `schema.table`.
 *
 * Multiple query listeners may target the same table, so we store them in a stack and
 * invoke every matching callback payload instead of overwriting the previous one.
 */
const subscriptions = new SvelteMap<
	`${string}.${string}`,
	Subscription<RowSchemaName, RowTableNames<RowSchemaName>>[]
>();

/**
 * Debounce timer used while rebuilding realtime channel bindings.
 */
let subscribe_timeout: ReturnType<typeof setTimeout> | null = null;
/**
 * Rebuilds the shared realtime channel from currently tracked subscriptions.
 *
 * @param {Client} client - Supabase client used for channel management.
 * @returns {void}
 */
const reset_realtime = (client: Client) => {
	if (subscribe_timeout) clearTimeout(subscribe_timeout);
	subscribe_timeout = setTimeout(async () => {
		const channels = client.getChannels();
		for (const c of channels) {
			if (c.topic === 'table-db-changes') {
				await client.removeChannel(c);
			}
		}

		const channel = client.channel('table-db-changes');

		for (const subscriptions_for_table of subscriptions.values()) {
			for (const subscription of subscriptions_for_table) {
				channel.on(
					'postgres_changes',
					{
						event: '*',
						schema: subscription.struct.schema,
						table: subscription.struct.table,
						filter: subscription.filter === '*' ? undefined : subscription.filter
					},
					async (payload) => {
						const type = payload.eventType;
						try {
							subscription.callback?.(
								subscription.struct.Generator(payload.new as any, {
									cache: false
								}),
								type,
								payload.old as any
							);
						} catch (error) {
							console.log('Realtime subscription callback failed', {
								error,
								payload
							});
						}
						switch (type) {
							case 'INSERT':
								{
									if (payload.new) {
										subscription.struct.Hydrate([payload.new as any]);
									}
								}
								break;
							case 'UPDATE':
								{
									if (payload.new) {
										subscription.struct.Hydrate([payload.new as any]);
									}
								}
								break;
							case 'DELETE':
								{
									const idValue = (payload.old as { id?: string } | null)?.id;
									if (!idValue) {
										console.log('Realtime DELETE payload missing old.id', payload);
										break;
									}
									const id = String(idValue);
									subscription.struct['purge_cache']([id]);
									const dexie = subscription.struct['getDexie'](
										subscription.struct['getSchemaDefinition']().Row as any
									);
									if (dexie) {
										await Promise.resolve(dexie['remove'](id)).catch((error) => {
											console.log('Failed to remove deleted realtime row from Dexie', {
												id,
												error
											});
										});
									}
								}
								break;
						}
					}
				);
			}
		}
		try {
			channel.subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
					console.log('Realtime subscription status: SUBSCRIBED');
				} else {
					console.log('Realtime subscription status update', { status, err });
				}
			});
		} catch (error) {
			console.error('Failed to subscribe to realtime channel', error);
		}
	}, 1000);
};

/**
 * Recursive search descriptor used by `search`.
 *
 * Supports:
 * - Atomic predicates (`field`, `operator`, `value`).
 * - Composite predicates (`type: 'and' | 'or'`) with nested `conditions`.
 *
 * @template Name - Table name used to infer valid field keys and values.
 *
 * @example
 * const q: SearchQuery<'users'> = {
 *   type: 'or',
 *   conditions: [
 *     { field: 'email', operator: 'ilike', value: '%@example.com' },
 *     { field: 'role', operator: 'eq', value: 'admin' }
 *   ]
 * };
 */
export type SearchQuery<Schema extends RowSchemaName, Name extends RowTableNames<Schema>> =
	| {
			/**
			 * Field to compare.
			 */
			field: keyof RowWithoutArchived<Schema, Name>;
			/**
			 * Comparison operator used for the field match.
			 */
			operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
			/**
			 * Expected value or list of values for the comparison.
			 */
			value:
				| RowWithoutArchived<Schema, Name>[keyof RowWithoutArchived<Schema, Name>]
				| RowWithoutArchived<Schema, Name>[keyof RowWithoutArchived<Schema, Name>][];
	  }
	| {
			/**
			 * Group operator used to combine child search nodes.
			 */
			type: 'and' | 'or';
			/**
			 * Child search nodes combined under this group.
			 */
			conditions: SearchQuery<Schema, Name>[];
	  };

/**
 * Registers a realtime descriptor and refreshes channel bindings.
 *
 * @template S - Active schema.
 * @template T - Target table.
 * @param {Client} client - Supabase client used for channel registration.
 * @param {Subscription<S, T>} subscription - Subscription descriptor to register.
 * @returns {ReturnType<typeof attemptAsync<void>>} Async registration result.
 */
const add_subscription = <S extends RowSchemaName, T extends RowTableNames<S>>(
	client: Client,
	subscription: Subscription<S, T>
) => {
	return attemptAsync(async () => {
		subscription.struct.log('Adding subscription', subscription);
		const key = `${subscription.struct.schema}.${String(subscription.struct.table)}` as const;
		const existing = subscriptions.get(key) ?? [];
		existing.push(subscription as any);
		subscriptions.set(key, existing);
		reset_realtime(client);
	});
};

/**
 * Represents a typed table adapter for a Supabase schema/table pair.
 *
 * A `SupaStruct` owns:
 * - the configured Supabase client and schema/table routing
 * - a reactive in-memory cache for row objects
 * - Dexie-backed hydration for local persistence
 * - a set of query builders such as `get`, `getOR`, `search`, `all`, and `join`
 * - row wrappers created via `Generator` and `Hydrate`
 *
 * Use a single struct per table to keep query creation consistent and cache keys stable.
 *
 * @template Schema - Database schema name.
 * @template RowName - Table name within that schema.
 *
 * @example
 * const profiles = SupaStruct.get({
 *   schema: 'core',
 *   table: 'profile',
 *   client: supabase
 * });
 *
 * const query = profiles.get({ archived: false, role: 'admin' });
 * const admins = await query;
 */
export class SupaStruct<Schema extends RowSchemaName, RowName extends RowTableNames<Schema>> {
	/**
	 * Shared registry of active table structs keyed by schema and table name.
	 */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	public static readonly structs = new Map<
		string,
		SupaStruct<RowSchemaName, RowTableNames<RowSchemaName>>
	>();

	/**
	 * Creates a struct instance for a table.
	 *
	 * @template Name - Target table name.
	 * @template Schema - Target schema name.
	 * @param config - Struct runtime configuration.
	 * @returns A new typed `SupaStruct` instance.
	 *
	 * @example
	 * const users = SupaStruct.get({
	 *   name: 'profile',
	 *   schema: 'core',
	 *   client: supabaseClient,
	 *   debug: true
	 * });
	 */
	public static get<Schema extends RowSchemaName, Name extends RowTableNames<Schema>>(
		config: SupaConfig<Schema, Name>
	): SupaStruct<Schema, Name> {
		const existing = SupaStruct.structs.get(`${config.schema}.${String(config.table)}`);
		if (existing) return existing as unknown as SupaStruct<Schema, Name>;
		const instance = new SupaStruct(config);
		if ((browser || config.client.serviceRole) && config.do_set !== false) {
			if (config.debug) instance.log('Caching struct for table', config.table);
			SupaStruct.structs.set(`${config.schema}.${String(config.table)}`, instance as any);
		}
		try {
			instance.initializeCache();
		} catch {
			//
		}
		return instance;
	}

	/**
	 * In-memory cache for this table's wrapped row objects.
	 */
	private _cache = $state(new SvelteMap<string, SupaStructData<Schema, RowName, 'id'>>());

	public get cache() {
		return this._cache;
	}

	private cache_to_add: SupaStructData<Schema, RowName, any>[] = [];

	private apply_cache = debounce(() => {
		this.log('Applying queued cache updates', {
			queued: this.cache_to_add.length
		});
		this._cache = new SvelteMap<string, SupaStructData<Schema, RowName, 'id'>>(
			[
				...this.cache_to_add.map(
					(data) => [data.raw.id, data] as [string, SupaStructData<Schema, RowName, 'id'>]
				),
				...Array.from(this._cache.entries())
			].filter(([key], i, arr) => arr.findIndex(([k]) => k === key) === i)
		);
		this.cache_to_add = [];
	}, 1);

	/**
	 * Creates a typed table struct.
	 *
	 * @param {SupaConfig<Schema, RowName>} config - Runtime table, schema, and client configuration.
	 * @example
	 * const profiles = new SupaStruct({ schema: 'core', table: 'profile', client: supabase });
	 */
	constructor(public readonly config: SupaConfig<Schema, RowName>) {
		this.log('Initialized SupaStruct', {
			schema: String(config.schema),
			table: String(config.table)
		});
	}

	/**
	 * Stores a wrapped row in the in-memory cache when browser-mode caching is enabled.
	 *
	 * @param {SupaStructData<Schema, RowName, 'id'>} data - Row wrapper to cache.
	 * @returns {void}
	 */
	private set_in_cache(data: SupaStructData<Schema, RowName, 'id'>) {
		this.log('Queueing row for cache merge', { id: data.raw.id });
		if (
			!this.supabase.serviceRole &&
			browser &&
			this.config.do_set !== false &&
			this.config.index_db !== false
		) {
			this.cache_to_add.push(data);
			this.apply_cache();
		}
	}

	private purge_cache(ids: Iterable<string>) {
		const normalized = new SvelteSet(Array.from(ids, (id) => String(id)));
		if (!normalized.size) return;
		this.log('Purging stale rows from cache and queue', { ids: Array.from(normalized) });
		this.cache_to_add = this.cache_to_add.filter(
			(queued) => !normalized.has(String((queued as any).raw.id))
		);
		for (const id of normalized) {
			this._cache.delete(id);
		}
		this.apply_cache();
	}

	/**
	 * Indicates whether the local Dexie cache for this table has already been initialized.
	 */
	private _initializedCache = false;
	/**
	 * Initializes the local Dexie cache metadata for this table.
	 *
	 * @returns {void}
	 */
	private initializeCache() {
		if (this._initializedCache) return;
		if (!this.config.index_db) return;
		this.log('Initializing cache for table', this.table, 'from IndexedDB');
		this._initializedCache = true;
		const dexie = this.getDexie(this.getSchemaDefinition().Row as any, false);
		if (dexie) {
			this.log('Initializing cache from IndexedDB for table', this.table);
		}
	}

	/**
	 * Resolves the generated Zod schema definition for the struct's table.
	 *
	 * @returns {{ Row: z.ZodObject<z.ZodRawShape> }} The row schema definition.
	 * @throws {Error} When no schema exists for the configured table.
	 */
	getSchemaDefinition(): {
		Row: z.ZodObject<z.ZodRawShape>;
	} {
		this.log('Resolving schema definition');
		const schema =
			((schemas as any)[this.schema]?.[this.table] as
				| {
						Row: typeof z.any;
						Insert: typeof z.any;
						Update: typeof z.any;
				  }
				| undefined) ?? ((schemas as any)[this.table] as any);
		if (!schema) {
			throw new Error(`No schema found for table ${this.table}`);
		}
		return schema;
	}

	/**
	 * Returns the non-null, non-optional row keys for this table in priority order.
	 *
	 * @returns {(keyof RowWithoutArchived<Schema, RowName>)[]} Required row keys, always including `id`.
	 */
	private getSchemaRowKeys(): (keyof RowWithoutArchived<Schema, RowName>)[] {
		this.log('Resolving required schema row keys');
		const schema = this.getSchemaDefinition();
		const rowSchema = schema.Row as any;
		const shape = rowSchema?.shape;
		if (!shape || typeof shape !== 'object') {
			return ['id'];
		}

		const required = Object.keys(shape);

		if (!required.includes('id')) {
			required.unshift('id');
		}

		return required as (keyof RowWithoutArchived<Schema, RowName>)[];
	}

	/**
	 * Normalizes a requested field list so it always contains the stable row id.
	 *
	 * @template Required - Requested field keys.
	 * @param {readonly Required[]} [required] - Requested projection fields.
	 * @returns {(Required | 'id')[] | (keyof RowWithoutArchived<Schema, RowName>)[]} Required field list with `id` forced in.
	 */
	private getEffectiveRequiredFields<Required extends keyof RowWithoutArchived<Schema, RowName>>(
		required?: readonly Required[]
	): (Required | 'id')[] | (keyof RowWithoutArchived<Schema, RowName>)[] {
		this.log('Normalizing required field set', required);
		if (!required) {
			return this.getSchemaRowKeys();
		}

		if (!required.length) {
			return [];
		}

		const normalized = required.map((field) => String(field));
		if (!normalized.includes('id')) {
			normalized.push('id');
		}
		return normalized as (Required | 'id')[];
	}

	/**
	 * Converts a requested field list into a PostgREST select clause string.
	 *
	 * @template Required - Requested field keys.
	 * @param {readonly Required[]} [required] - Fields to project.
	 * @returns {string} PostgREST-compatible select string.
	 */
	private buildSelectClause<Required extends keyof RowWithoutArchived<Schema, RowName>>(
		required?: readonly Required[]
	) {
		this.log('Building select clause', required);
		if (!required) {
			return '*';
		}
		const fields = this.getEffectiveRequiredFields(required);
		return fields.map((field) => String(field)).join(',');
	}

	/**
	 * Escapes a raw value into a quoted PostgREST literal.
	 *
	 * @param {unknown} value - Value to serialize.
	 * @returns {string} Serialized literal.
	 */
	private toPostgrestLiteral(value: unknown) {
		this.log('Serializing PostgREST literal value', value);
		if (value === null) return 'null';
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}

		const str = typeof value === 'string' ? value : JSON.stringify(value);
		return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
	}

	/**
	 * Returns the Dexie table instance for this struct, creating it when needed.
	 *
	 * @param {z.ZodType<RowWithoutArchived<Schema, RowName>>} schema - Row schema for the Dexie table.
	 * @param {boolean} [initialize=false] - Whether to initialize cache state before returning.
	 * @returns {ReturnType<typeof DexieTable.get> | undefined} Dexie table instance in browser mode.
	 */
	getDexie(schema: z.ZodType<RowWithoutArchived<Schema, RowName>>, initialize = false) {
		this.log('Resolving Dexie table', {
			initialize,
			index_db: this.config.index_db,
			browser
		});
		if (this.config.index_db === false) return;
		if (initialize) {
			this.initializeCache();
		}
		if (browser) {
			return DexieTable.get({
				name: `v1.${this.config.schema}.${String(this.config.table)}`,
				schema: schema,
				debug: this.config.debug
			});
		}
	}

	/**
	 * Validates a raw Supabase transaction payload against an expected cardinality.
	 *
	 * @param transaction - Response payload containing `data` and `error`.
	 * @param expect - Expected result shape (`array`, `single`, or `null`).
	 * @returns A `Result` wrapping typed data or an error.
	 */
	runTransaction<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		transaction: {
			data: RowWithoutArchived<Schema, RowName>[] | RowWithoutArchived<Schema, RowName> | null;
			error: Error | null;
		},
		expect: 'array',
		required?: readonly Required[]
	): Result<PartialRow<Schema, RowName, Required>[], SupaError>;
	runTransaction<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		transaction: {
			data: RowWithoutArchived<Schema, RowName>[] | RowWithoutArchived<Schema, RowName> | null;
			error: Error | null;
		},
		expect: 'single',
		required?: readonly Required[]
	): Result<PartialRow<Schema, RowName, Required>, SupaError>;
	runTransaction(
		transaction: {
			data: RowWithoutArchived<Schema, RowName>[] | RowWithoutArchived<Schema, RowName> | null;
			error: Error | null;
		},
		expect: 'null'
	): Result<null, SupaError>;
	runTransaction<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		transaction: {
			data: RowWithoutArchived<Schema, RowName>[] | RowWithoutArchived<Schema, RowName> | null;
			error: Error | null;
		},
		expect: 'array' | 'single' | 'null',
		required?: readonly Required[]
	): Result<
		PartialRow<Schema, RowName, Required>[] | PartialRow<Schema, RowName, Required> | null,
		SupaError
	> {
		return attempt(() => {
			this.log('Running transaction', {
				expect,
				required
			});
			if (transaction.error) {
				this.log('Transaction error:', transaction.error);
				if (
					transaction.error.message.includes('permission denied') ||
					transaction.error.message.includes('rls')
				) {
					throw new SupaError('unauthorized', `Permission denied: ${transaction.error.message}`);
				} else {
					throw new SupaError('unknown', `Unknown error: ${transaction.error.message}`);
				}
			}

			const requiredFields = this.getEffectiveRequiredFields(required);

			// Validate each returned row includes required projected fields before hydration.
			const validate = (item: unknown) => {
				if (item === null || typeof item !== 'object') {
					this.log('Expected array of objects, received item of type', typeof item);
					throw new Error(`Expected an object but got ${typeof item}`);
				}
				for (const field of requiredFields) {
					if (!(field in item)) {
						this.log(`Missing required field ${String(field)} in item`, item);
						throw new Error(`Expected field ${String(field)} is missing in item`);
					}
				}
			};

			if (expect === 'array') {
				if (!Array.isArray(transaction.data)) {
					this.log('Expected array, received', typeof transaction.data);
					throw new SupaError(
						'invalid data',
						`Expected an array but got ${typeof transaction.data}`
					);
				}
				for (const item of transaction.data) validate(item);
				return transaction.data;
			} else if (expect === 'single') {
				if (Array.isArray(transaction.data)) {
					this.log('Expected single object, received array');
					throw new SupaError('invalid data', `Expected a single object but got an array`);
				}
				if (transaction.data === null) {
					this.log('Expected single object, received null');
					throw new SupaError('invalid data', `Expected a single object but got null`);
				}
				validate(transaction.data);
				this.log('Transaction successful with single result:', transaction.data);
				return transaction.data;
			} else {
				// expect === 'null'
				if (transaction.data !== null) {
					this.log('Expected null, received', typeof transaction.data);
					throw new SupaError('invalid data', `Expected null but got ${typeof transaction.data}`);
				}
				this.log('Transaction successful with null result');
				return null;
			}
		});
	}

	/**
	 * Returns the configured table name.
	 *
	 * @returns {Extract<RowName, string>} String table name.
	 */
	get table(): Extract<RowName, string> {
		return String(this.config.table) as Extract<RowName, string>;
	}

	/**
	 * Returns the configured Supabase client.
	 *
	 * @returns {Client} Supabase client bound to the app database type.
	 * @example
	 * await struct.supabase.schema('core').from(struct.table).select('*');
	 */
	get supabase() {
		return this.config.client;
	}

	/**
	 * Returns the configured schema name.
	 *
	 * @returns {Schema} Active schema name.
	 * @example
	 * console.log(struct.schema);
	 */
	get schema() {
		return this.config.schema;
	}

	/**
	 * Logs scoped debug output when debug mode is enabled.
	 *
	 * @param {...unknown[]} args - Values to log.
	 * @returns {void}
	 * @example
	 * struct.log('Loaded rows', rows.length);
	 */
	log(...args: unknown[]) {
		if (this.config.debug) {
			console.log(`[SupaStruct:${this.table}] (${new SvelteDate().toISOString()})`, ...args);
		}
	}

	/**
	 * Validates input against the generated zod row schema for this table.
	 *
	 * @param {unknown} data - Unknown payload to validate.
	 * @returns {RowWithoutArchived<Schema, RowName>} Parsed row-like object
	 * @throws If the table schema is missing or parsing fails.
	 * @example
	 * const row = struct['validate'](payload);
	 */
	private validate<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(data: unknown, required?: readonly Required[]): PartialRow<Schema, RowName, Required> {
		this.log('Validating row payload', { required });
		const schema = this.getSchemaDefinition();
		const parseResult = schema.Row.partial().safeParse(data);
		if (!parseResult.success) {
			throw new SupaError(
				'invalid data',
				`Failed to validate data for table ${this.table}: ` + parseResult.error.message
			);
		}

		const requiredFields = this.getEffectiveRequiredFields(required);

		for (const field of requiredFields) {
			const nullable = (schema.Row.shape as any)[field]?.isNullable() ?? false;
			if (!nullable && !(field in parseResult.data)) {
				this.log(
					`Validated data for table ${this.table} is missing required field ${String(field)}`,
					{
						data: parseResult.data,
						requiredFields
					}
				);
				// throw new SupaError(
				// 	'invalid data',
				// 	`Validated data for table ${this.table} is missing required field ${String(field)}`
				// );
			}
		}
		return parseResult.data as PartialRow<Schema, RowName, Required>;
	}

	/**
	 * Normalizes a row payload into a cached `SupaStructData` instance.
	 *
	 * @param {RowWithoutArchived<Schema, RowName>} row - Raw or typed row payload.
	 * @returns {SupaStructData<Schema, RowName>} Stable row wrapper.
	 * @example
	 * const wrapped = struct.Generator(rawRow);
	 */
	Generator<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		row: PartialRow<Schema, RowName, Required>,
		config?: { required?: readonly Required[]; cache?: boolean }
	): SupaStructData<Schema, RowName, Required | 'id'> {
		this.log('Generating struct data for row with id', row.id);
		const effectiveRequired = this.getEffectiveRequiredFields(config?.required);
		const validated = this.validate<Required | 'id'>(
			row,
			effectiveRequired as readonly (Required | 'id')[]
		);
		const exists = this.cache.get(String(validated.id));
		if (exists) {
			this.log(`Cache hit for row with id ${validated.id}`);
			// update existing cache instance with any new data
			Object.assign(exists.raw as any, row); // apply row updates so that other things that require more aren't broken by missing fields, but keep the existing instance to preserve references and reactivity
			this.set_in_cache(exists);
			return exists as unknown as SupaStructData<Schema, RowName, Required | 'id'>;
		}

		// using the unvalidated row here because the validated type is only guaranteed to have the required fields, but the cache instance needs to be able to access all fields. The validate method will throw if any required fields are missing, so this should be safe as long as the struct is used consistently with its validation guarantees.
		const rowData = new SupaStructData<Schema, RowName, Required | 'id'>(this, row as any);
		this.set_in_cache(rowData);
		return rowData;
	}

	/**
	 * Hydrates raw row payloads into the struct cache and Dexie store.
	 *
	 * This method is the main normalization point for query results. It validates, wraps, and caches
	 * rows so downstream code receives stable `SupaStructData` instances instead of raw objects.
	 *
	 * @template Required - Fields considered required during hydration.
	 * @param {PartialRow<Schema, RowName, Required | 'id'>[]} rows - Row payloads to hydrate.
	 * @param {readonly Required[]} [required] - Requested field projection for validation.
	 * @param {(data: SupaStructData<Schema, RowName, Required | 'id'>) => boolean} [satisfies] - Optional predicate used to prune stale cache entries.
	 * @returns {SupaStructData<Schema, RowName, Required | 'id'>[]} Wrapped rows in cache order.
	 * @example
	 * const hydrated = users.Hydrate([
	 *   { id: '1', archived: false, email: 'a@example.com' }
	 * ]);
	 */
	Hydrate<
		Required extends keyof RowWithoutArchived<Schema, RowName> =
			'id' | keyof RowWithoutArchived<Schema, RowName>
	>(
		rows: PartialRow<Schema, RowName, Required | 'id'>[],
		required?: readonly Required[],
		satisfies?: (data: SupaStructData<Schema, RowName, Required | 'id'>) => boolean
	) {
		this.log(`Hydrating ${rows.length} rows into cache for table ${this.table}`, rows);
		const hydrated = rows.map((row) => this.Generator(row, { required }));

		let to_delete: string[] = [];

		if (satisfies) {
			// if a value is in the cache and satisfies the provided function but is not in the hydrated results, remove it from the cache and delete it from dexie
			const hydratedIds = new SvelteSet(hydrated.map((data) => String(data.raw.id)));
			to_delete = Array.from(this.cache.values())
				.filter((data) => satisfies(data as any) && !hydratedIds.has(String(data.raw.id)))
				.map((d) => String(d.raw.id));

			this.log(`Rows to delete from cache and IndexedDB for table ${this.table}:`, to_delete);
			this.purge_cache(to_delete);
		}

		const dexie = this.getDexie(this.getSchemaDefinition().Row as any);
		if (dexie) {
			const now = Date.now();
			const rowsForDexie = rows.map((row) => {
				const raw = row as Record<string, unknown>;
				const rowHydratedAt = typeof raw._hydrated_at === 'number' ? raw._hydrated_at : now;
				const rowTtl = typeof raw._ttl === 'number' ? raw._ttl : 0;
				return {
					...raw,
					_hydrated_at: rowHydratedAt,
					...(rowTtl > 0 ? { _ttl: rowTtl } : {})
				};
			});

			this.log(`Upserting ${hydrated.length} rows into IndexedDB for table ${this.table}`);
			// upsert into IndexedDB
			dexie
				.bulkUpsert(rowsForDexie as any)
				.then((res) => {
					if (res.isOk()) {
						this.log(`Upserted ${res.value} rows into IndexedDB for table ${this.table}`);
					} else {
						this.log('Error upserting rows into IndexedDB:', res.error);
					}
				})
				.finally(() => {
					this.log(
						`Finished upserting ${hydrated.length} rows into IndexedDB for table ${this.table}`
					);
				});

			dexie.delete_by_ids(to_delete).then((res) => {
				if (res.isOk()) {
					this.log(`Deleted ${res.value} rows from IndexedDB for table ${this.table}`);
				} else {
					this.log('Error deleting rows from IndexedDB:', res.error);
				}
				this.log(
					`Finished deleting ${to_delete.length} rows from IndexedDB for table ${this.table}`
				);
				to_delete = [];
			});
		}

		return hydrated;
	}

	/**
	 * Joins this table with another struct using an inner relationship and returns a query wrapper.
	 *
	 * This method attempts to hydrate from the Dexie cache first and falls back to a Supabase join when needed.
	 * It is useful for pulling rows from related tables with a stable left/right projection.
	 *
	 * @template OtherSchema - Foreign schema.
	 * @template OtherRowName - Foreign table name.
	 * @template RequiredA - Fields requested from the left table.
	 * @template RequiredB - Fields requested from the right table.
	 * @param {SupaStruct<OtherSchema, OtherRowName>} other - Target table to join against.
	 * @param {{ requiredA?: readonly RequiredA[]; whereB?: Partial<RowWithoutArchived<OtherSchema, OtherRowName>>; joinOn?: { left: keyof RowWithoutArchived<Schema, RowName>; right: keyof RowWithoutArchived<OtherSchema, OtherRowName> }; pullB?: boolean; requiredB?: readonly RequiredB[]; }} [config] - Join configuration.
	 * @returns {SupaQuery<Schema, RowName, RequiredA | 'id'>} Query wrapper for the joined result set.
	 * @throws {Error} When the join spans different schemas.
	 */
	join<
		OtherSchema extends RowSchemaName,
		OtherRowName extends RowTableNames<OtherSchema>,
		RequiredA extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>,
		RequiredB extends keyof RowWithoutArchived<OtherSchema, OtherRowName> =
			keyof RowWithoutArchived<OtherSchema, OtherRowName>
	>(
		other: SupaStruct<OtherSchema, OtherRowName>,
		config?: {
			requiredA?: readonly RequiredA[];
			whereB?: Partial<RowWithoutArchived<OtherSchema, OtherRowName>>;
			joinOn?: {
				left: keyof RowWithoutArchived<Schema, RowName>;
				right: keyof RowWithoutArchived<OtherSchema, OtherRowName>;
			};
		} & (
			| {
					pullB?: true;
					requiredB?: readonly RequiredB[];
			  }
			| {
					pullB: false;
					requiredB?: never;
			  }
		)
	): JoinQuery<Schema, RowName, OtherSchema, OtherRowName, RequiredA, RequiredB> {
		this.log('Creating join query', {
			other: String(other.table),
			config
		});
		if (String(this.schema) !== String(other.schema)) {
			throw new Error(
				`Cannot join tables from different schemas: ${this.schema} and ${other.schema}`
			);
		}
		return new JoinQuery(this, other, config);
	}

	/**
	 * Fetches rows that satisfy all provided field/value pairs.
	 *
	 * @param {Partial<Row<Schema, RowName>>} queryData - AND-style match criteria.
	 * @returns {SupaQuery<Schema, RowName>} Query wrapper with reactive and paginated access.
	 * @example
	 * const q = struct.get({ archived: false });
	 * const rows = await q;
	 */
	get<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		queryData: Partial<RowWithoutArchived<Schema, RowName>>,
		config?: ReadConfig<Schema, RowName, Required>
	) {
		this.log('Creating AND query', {
			queryData,
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		const conditions = Object.entries(queryData)
			.filter(([, value]) => value !== undefined)
			.map(([field, value]) => ({
				field: field as keyof RowWithoutArchived<Schema, RowName>,
				operator: 'eq' as const,
				value: value as any
			}));
		const search: SearchQuery<Schema, RowName> | '*' = conditions.length
			? { type: 'and', conditions }
			: '*';

		return new SupaQuery(this, search, required);
	}

	/**
	 * Fetches rows that satisfy any provided field/value pair.
	 *
	 * @param {Partial<Row<Schema, RowName>>} queryData - OR-style match criteria.
	 * @returns {SupaQuery<Schema, RowName>} Query wrapper with reactive and paginated access.
	 * @example
	 * const q = struct.getOR({ archived: true, severity: 'warn' } as Partial<RowWithoutArchived<Schema, RowName>>);
	 */
	getOR<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(
		queryData: Partial<RowWithoutArchived<Schema, RowName>>,
		config?: ReadConfig<Schema, RowName, Required>
	) {
		this.log('Creating OR query', {
			queryData,
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		const conditions = Object.entries(queryData)
			.filter(([, value]) => value !== undefined)
			.map(([field, value]) => ({
				field: field as keyof RowWithoutArchived<Schema, RowName>,
				operator: 'eq' as const,
				value: value as any
			}));
		const search: SearchQuery<Schema, RowName> | '*' = conditions.length
			? { type: 'and', conditions }
			: '*';

		return new SupaQuery(this, search, required);
	}

	/**
	 * Builds and executes nested AND/OR search predicates.
	 *
	 * @param {SearchQuery<Schema, RowName>} query - Recursive search descriptor.
	 * @returns {SupaQuery<Schema, RowName>} Query wrapper for full or paginated retrieval.
	 * @example
	 * const q = struct.search({ field: 'archived', operator: 'eq', value: false } as SearchQuery<Schema, RowName>);
	 */
	search<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(query: SearchQuery<Schema, RowName>, config?: ReadConfig<Schema, RowName, Required>) {
		this.log('Creating search query', {
			query,
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		return new SupaQuery(this, query, required);
	}

	/**
	 * Reads a single row by `id`.
	 *
	 * @param {string} id - Row primary key.
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName>>>} Async result wrapper.
	 * @example
	 * const result = await struct.fromId('abc123');
	 */
	fromId<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(id: string, config?: ReadConfig<Schema, RowName, Required>) {
		this.log('Creating fromId query', {
			id,
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		const selectClause = this.buildSelectClause(config?.only);

		return attemptAsync<SupaStructData<Schema, RowName, Required | 'id'>>(async () => {
			const dexie = this.getDexie(this.getSchemaDefinition().Row as any);
			if (dexie) {
				const res = await dexie.fromId(id).unwrap();
				if (res) {
					return this.Generator(res.raw, { required });
				}
			}

			this.log(`Fetching row with id ${id} from table ${this.table}`);
			const res = await this.supabase
				.schema(this.config.schema)
				.from(this.table)
				.select(selectClause)
				.filter('id', 'eq', id)
				.filter('archived', 'eq', false)
				.single();
			const result = this.runTransaction(
				{
					data: res.data as any,
					error: res.error
				},
				'single',
				required
			).unwrap();

			this.log(`Fetched row with id ${id} from Supabase for table ${this.table}`, result);

			if (dexie && result) {
				dexie.upsert(result as any).then((res) => {
					if (res.isOk()) {
						this.log(`Upserted row with id ${id} into IndexedDB for table ${this.table}`);
					} else {
						this.log(`Error upserting row with id ${id} into IndexedDB:`, res.error);
					}
				});
			}

			return this.Generator(result, { required });
		});
	}

	/**
	 * Builds a query by a set of row ids.
	 *
	 * @template Required - Fields to project for each row.
	 * @param {string[]} ids - Row ids to resolve.
	 * @param {ReadConfig<Schema, RowName, Required>} [config] - Optional projection config.
	 * @returns {SupaQuery<Schema, RowName, Required | 'id'>} Query that resolves matching rows.
	 * @example
	 * const query = users.fromIds(['a', 'b', 'c']);
	 * const rows = await query;
	 */
	fromIds<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(ids: string[], config?: ReadConfig<Schema, RowName, Required>) {
		this.log('Creating fromIds query', {
			count: ids.length,
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		const search: SearchQuery<Schema, RowName> = {
			field: 'id' as keyof RowWithoutArchived<Schema, RowName>,
			operator: 'in',
			value: ids as any
		};
		return new SupaQuery(this, search, required);
	}

	/**
	 * Inserts one or more rows and returns hydrated wrappers.
	 *
	 * Rows are first hydrated into local cache (and Dexie when enabled), then inserted
	 * into Supabase when online. On insert failure, temporary local rows are removed.
	 *
	 * @param {...Insert<Schema, Extract<RowName, InsertTableNames<Schema>>>} data - Row insert payloads.
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, 'id' | keyof RowWithoutArchived<Schema, RowName>>[], SupaError>>} Async inserted-row result.
	 * @example
	 * const created = await struct.new({ id: '1' } as Insert<Schema, Extract<RowName, InsertTableNames<Schema>>>);
	 */
	new(...data: Insert<Schema, Extract<RowName, InsertTableNames<Schema>>>[]) {
		this.log('Creating new rows', {
			count: data.length
		});
		return attemptAsync<
			SupaStructData<Schema, RowName, 'id' | keyof RowWithoutArchived<Schema, RowName>>[],
			SupaError
		>(async () => {
			// hydrate immediately for reactivity
			const hydrated = this.Hydrate(
				data.map(
					(d) =>
						({
							created_at: new SvelteDate().toISOString(),
							id: crypto.randomUUID(),
							...d
						}) as any
				)
			);
			const dexie = this.getDexie(this.getSchemaDefinition().Row as any);
			if (dexie) {
				// insert into dexie asyncronously and don't wait for it
				dexie.bulkNew(hydrated.map((d) => d.raw as any)).then((results) => {
					if (results.isErr()) {
						this.log('Error inserting new row into Dexie cache:', results.error);
					}
				});
			}

			if (!is_online()) {
				this.log('Offline: Skipping Supabase insert and only updating local cache');
				await OfflineUpdates.new({
					table: this.table,
					schema: this.config.schema,
					data: hydrated.map((d) => d.raw as any),
					action: 'insert',
					id: `${Math.floor(Math.random() * 1000000)}-${Date.now()}`,
					created_at: new SvelteDate()
				});
				return hydrated;
			}

			const { error } = await this.supabase
				.schema(this.config.schema)
				.from(this.table)
				.insert(hydrated.map((d) => d.raw as any));

			if (error) {
				this.log('Error inserting new row:', error);
				for (const item of hydrated) item['_deleteLocal']();
				throw new Error(`Failed to insert new row: ${error.message}`);
			}
			return hydrated;
		});
	}

	/**
	 * Upserts a row and returns the wrapped resulting row.
	 *
	 * @param {Insert<Schema, Extract<RowName, InsertTableNames<Schema>>>} data - Upsert payload.
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName>>>} Async result wrapper.
	 * @example
	 * const row = await struct.upsert({ id: '1' } as Insert<Schema, Extract<RowName, InsertTableNames<Schema>>>);
	 */
	upsert(
		data: (InsertWithoutArchived<Schema, Extract<RowName, InsertTableNames<Schema>>> & {
			id?: string;
			created_at?: Date;
		})[],
		config?: {
			onConflict: keyof RowWithoutArchived<Schema, RowName>;
			ignoreDuplicates?: boolean;
		}
	) {
		this.log('Upserting rows', {
			count: data.length,
			config
		});
		return attemptAsync(async () => {
			const hydrated = this.Hydrate(
				data.map(
					(d) =>
						({
							created_at: new SvelteDate().toISOString(),
							id: d.id ?? crypto.randomUUID(),
							...d
						}) as any
				)
			);

			const dexie = this.getDexie(this.getSchemaDefinition().Row as any);
			if (dexie) {
				// upsert into dexie asyncronously and don't wait for it
				dexie.bulkUpsert(hydrated.map((d) => d.raw as any)).then((results) => {
					if (results.isErr()) {
						this.log('Error upserting row into Dexie cache:', results.error);
					}
				});
			}

			if (!is_online()) {
				this.log('Offline: Skipping Supabase upsert and only updating local cache');
				await OfflineUpdates.new({
					table: this.table,
					schema: this.config.schema,
					data: hydrated.map((d) => d.raw as any),
					action: 'upsert',
					id: `${Math.floor(Math.random() * 1000000)}-${Date.now()}`,
					created_at: new SvelteDate()
				});
				return hydrated;
			}

			const { error } = await this.supabase
				.schema(this.config.schema)
				.from(this.table)
				.upsert(
					data as any,
					config
						? {
								onConflict: String(config.onConflict),
								ignoreDuplicates: config.ignoreDuplicates ?? true
							}
						: undefined
				);

			if (error) {
				this.log('Error upserting row:', error);
				for (const item of hydrated) item['_deleteLocal']();
				throw new Error(`Failed to upsert row: ${error.message}`);
			}

			return hydrated;
		});
	}

	/**
	 * Fetches all rows for the table.
	 *
	 * @returns {SupaQuery<Schema, RowName>} Query wrapper with full and paginated accessors.
	 * @example
	 * const q = struct.all();
	 * const rows = await q;
	 */
	all<
		Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
			Schema,
			RowName
		>
	>(config?: ReadConfig<Schema, RowName, Required>) {
		this.log('Creating all query', {
			only: config?.only
		});
		const required = this.getEffectiveRequiredFields(config?.only) as readonly (Required | 'id')[];
		return new SupaQuery(this, '*', required);
	}
}

// Define a type for the paginated response that includes the total count
/**
 * Response shape for a single paginated fetch.
 */
type PaginatedResponse<T> = { data: T[]; count: number };

/**
 * Query wrapper for non-join table reads.
 *
 * It builds Supabase queries from `filters`, hydrates local cache from Dexie first,
 * supports pagination/count/sync helpers, and resolves to wrapped row models.
 *
 * @template Schema - Active schema.
 * @template RowName - Target table.
 * @template Required - Required projected fields.
 * @template HasDefault - Whether `default()` was called.
 */
class SupaQuery<
	Schema extends RowSchemaName,
	RowName extends RowTableNames<Schema>,
	Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
		Schema,
		RowName
	>,
	HasDefault extends boolean = false
> {
	private _default: SupaStructData<Schema, RowName, Required>['raw'] | null = null;

	private _sort: (
		a: SupaStructData<Schema, RowName, Required>,
		b: SupaStructData<Schema, RowName, Required>
	) => number = $state((a, b) => {
		if (String(a.id) < String(b.id)) return -1;
		if (String(a.id) > String(b.id)) return 1;
		return 0;
	});

	private _reverse = $state(false);

	/**
	 * Creates a non-join query wrapper for a struct.
	 *
	 * @param {SupaStruct<Schema, RowName>} struct - Owning table struct.
	 * @param {SearchQuery<Schema, RowName> | '*'} filters - Search filter tree or wildcard selector.
	 * @param {readonly Required[]} required - Required projection fields for hydration.
	 */
	constructor(
		public readonly struct: SupaStruct<Schema, RowName>,
		public readonly filters: SearchQuery<Schema, RowName> | '*',
		public readonly required: readonly Required[]
	) {
		this.struct.log('Initialized SupaQuery', {
			filters: this.filters,
			required: this.required
		});
	}

	/**
	 * Evaluates whether a cached row matches the current search filter.
	 *
	 * @param {SupaStructData<Schema, RowName, Required>} data - Row wrapper to evaluate.
	 * @returns {boolean} True when row satisfies current filters.
	 */
	private matches_filter(data: SupaStructData<Schema, RowName, Required>): boolean {
		this.struct.log('Evaluating filter match for row', { id: data.id });
		if (this.filters === '*') return true;

		const evaluate = (filter: SearchQuery<Schema, RowName>): boolean => {
			if ('field' in filter) {
				const value = data.raw[filter.field as keyof RowWithoutArchived<Schema, RowName>] as any;
				if (value === undefined || value === null) return false;

				switch (filter.operator) {
					case 'eq':
						return value === filter.value;
					case 'neq':
						return value !== filter.value;
					case 'gt':
						return Number(value) > Number(filter.value);
					case 'lt':
						return Number(value) < Number(filter.value);
					case 'gte':
						return Number(value) >= Number(filter.value);
					case 'lte':
						return Number(value) <= Number(filter.value);
					case 'like': {
						if (typeof value !== 'string' || typeof filter.value !== 'string') return false;
						return value.includes(filter.value.replaceAll('%', ''));
					}
					case 'ilike': {
						if (typeof value !== 'string' || typeof filter.value !== 'string') return false;
						return value.toLowerCase().includes(filter.value.replaceAll('%', '').toLowerCase());
					}
					case 'in':
						return Array.isArray(filter.value) && filter.value.includes(value as never);
					default:
						return false;
				}
			}

			if (filter.type === 'and') {
				return filter.conditions.every(evaluate);
			}

			return filter.conditions.some(evaluate);
		};

		return evaluate(this.filters);
	}

	/**
	 * Escapes values for realtime PostgREST filter serialization.
	 *
	 * @param {unknown} value - Value to normalize.
	 * @returns {string} Serialized representation.
	 */
	private serializeFilterValue(value: unknown) {
		this.struct.log('Normalizing realtime value', value);
		if (value === null) return 'null';
		if (typeof value === 'number' || typeof value === 'boolean') return String(value);
		if (typeof value === 'string') return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		return JSON.stringify(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}

	/**
	 * Converts nested filter objects into realtime filter strings.
	 *
	 * @param {SearchQuery<Schema, RowName> | '*'} filter - Query filter.
	 * @returns {string} Realtime filter expression.
	 */
	private build_realtime_string(filter: SearchQuery<Schema, RowName> | '*'): string {
		this.struct.log('Building realtime filter string', filter);
		const f = postgresChangesFilter();
		if (filter === '*') return f.build();

		const walk = (node: SearchQuery<Schema, RowName>) => {
			if ('field' in node) {
				const { field, value, operator } = node;
				switch (operator) {
					case 'eq':
						return f.eq(String(field), value as any);
					case 'gt':
						return f.gt(String(field), value as any);
					case 'gte':
						return f.gte(String(field), value as any);
					case 'lt':
						return f.lt(String(field), value as any);
					case 'lte':
						return f.lte(String(field), value as any);
					case 'ilike':
						return f.ilike(String(field), value as any);
					case 'like':
						return f.like(String(field), value as any);
					case 'in':
						return f.in(String(field), value as any);
					case 'neq':
						return f.neq(String(field), value as any);
					default:
						throw new Error(`Unsupported operator: ${operator}`);
				}
			} else {
				const { type, conditions } = node;
				switch (type) {
					case 'and': {
						for (const condition of conditions) walk(condition);
						return f;
					}
					case 'or': {
						console.warn(
							'Unable to do "or" conditions on realtime, they will be treated as "and" conditions.'
						);
						for (const condition of conditions) walk(condition);
						return f;
					}
					default:
						throw new Error(`Unsupported condition type: ${type}`);
				}
			}
		};
		walk(filter);
		return f.build();
	}

	/**
	 * Reactive rows currently matching this query from in-memory cache.
	 *
	 * @returns {SupaStructData<Schema, RowName, Required>[]} Sorted matching rows.
	 */
	get reactive(): SupaStructData<Schema, RowName, Required>[] {
		const rows = Array.from(this.struct.cache.values()).filter((item) =>
			this.matches_filter(item as any)
		);
		return rows.sort(
			(a, b) => (this._reverse ? -1 : 1) * this._sort(a as any, b as any)
		) as SupaStructData<Schema, RowName, Required>[];
	}

	/**
	 * First matching row or the configured default when present.
	 *
	 * @returns {SupaStructData<Schema, RowName, Required> | null} Selected row.
	 */
	get single(): HasDefault extends true
		? SupaStructData<Schema, RowName, Required>
		: SupaStructData<Schema, RowName, Required> | null {
		const [[first], last] = [this.reactive, this._default];
		if (first) return first as any;
		if (last)
			return this.struct.Generator(this._default as any, {
				cache: false,
				required: this.required as any
			});
		return null as any;
	}

	/**
	 * Pagination adapter for on-demand page fetches.
	 *
	 * @returns {{ page: (page: number, size: number) => Promise<PaginatedResponse<SupaStructData<Schema, RowName, Required>>> }} Page fetch facade.
	 */
	get paginated() {
		return {
			page: async (page: number, size: number) => {
				const res = await this.fetch_paginated(page, size);
				if (res.isErr()) throw res.error;
				return res.value;
			}
		};
	}

	/**
	 * Sets custom sort comparator for `reactive` rows.
	 *
	 * @param {(a: SupaStructData<Schema, RowName, Required>, b: SupaStructData<Schema, RowName, Required>) => number} sort - Comparator.
	 * @returns {SupaQuery<Schema, RowName, Required, HasDefault>} Current query instance.
	 */
	sort(
		sort: (
			a: SupaStructData<Schema, RowName, Required>,
			b: SupaStructData<Schema, RowName, Required>
		) => number
	) {
		this.struct.log('Setting query sort comparator');
		this._sort = sort;
		return this;
	}

	/**
	 * Toggles reverse ordering for `reactive` rows.
	 *
	 * @returns {SupaQuery<Schema, RowName, Required, HasDefault>} Current query instance.
	 */
	reverse() {
		this.struct.log('Toggling query reverse sort order');
		this._reverse = !this._reverse;
		return this;
	}

	/**
	 * Pulls matching rows from Dexie and hydrates the in-memory cache.
	 *
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, Required>[]>>} Dexie hydration result.
	 */
	private pull_dexie() {
		this.struct.log('Pulling query data from Dexie cache');
		return attemptAsync(async () => {
			const dexie = this.struct.getDexie(this.struct.getSchemaDefinition().Row as any);
			if (!dexie) return [] as SupaStructData<Schema, RowName, Required>[];

			const rows =
				this.filters === '*' ? await dexie.all() : await dexie.search(this.filters as any);
			if (rows.isErr()) return [] as SupaStructData<Schema, RowName, Required>[];

			const hydrated = this.struct.Hydrate(
				rows.value.map((row) => row.raw as any),
				this.required as any
			) as SupaStructData<Schema, RowName, Required>[];

			return hydrated.filter((data) => this.matches_filter(data));
		});
	}

	/**
	 * Removes stale rows from Dexie when the remote result set no longer contains them.
	 */
	private async pruneStaleDexieRows(remoteRows: PartialRow<Schema, RowName, Required>[]) {
		const dexie = this.struct.getDexie(this.struct.getSchemaDefinition().Row as any);
		if (!dexie) return;

		const localRows =
			this.filters === '*' ? await dexie.all() : await dexie.search(this.filters as any);
		if (localRows.isErr()) return;

		const remoteIds = new SvelteSet(remoteRows.map((row) => String((row as any).id)));
		const staleIds = localRows.value
			.map((row) => String((row.raw as any).id))
			.filter((id) => !remoteIds.has(id));

		if (!staleIds.length) return;

		this.struct.log('Pruning stale Dexie rows not present in Supabase result', {
			count: staleIds.length,
			ids: staleIds
		});

		const deleted = await dexie.delete_by_ids(staleIds);
		if (deleted.isErr()) {
			this.struct.log('Failed pruning stale Dexie rows', deleted.error);
		}
	}

	/**
	 * Builds Supabase query and companion realtime filter from current `filters`.
	 *
	 * @param {'exact' | 'estimated' | 'planned'} [count] - Optional count mode.
	 * @returns {{ query: any; realtime: string; select: string[] }} Query bundle.
	 */
	private build(count?: 'exact' | 'estimated' | 'planned') {
		this.struct.log('Building Supabase query', { count });
		let to_select = '*';
		if (this.required.length) {
			to_select = this.required.map(String).join(',');
		}
		const query = this.struct.supabase
			.schema(this.struct.schema)
			.from(this.struct.table)
			.select(to_select, {
				count
			})
			.filter('archived', 'eq', false);

		if (this.filters === '*') {
			return { query, realtime: '*', select: to_select };
		}

		type QueryBuilder = typeof query;

		const apply = (builder: QueryBuilder, node: SearchQuery<Schema, RowName>): QueryBuilder => {
			if ('field' in node) {
				const field = String(node.field);
				const value = node.value;
				if (node.operator === 'in') {
					if (!Array.isArray(value)) return builder;
					return builder.filter(
						field,
						'in',
						value as readonly (string | number | boolean | null | Record<string, unknown>)[]
					);
				}
				return builder.filter(
					field,
					node.operator,
					value as string | number | boolean | null | Record<string, unknown>
				);
			}

			if (node.type === 'and') {
				for (const condition of node.conditions) {
					builder = apply(builder, condition);
				}
				return builder;
			}

			const orParts = node.conditions
				.map((condition) => {
					if (!('field' in condition)) return null;
					const field = String(condition.field);
					const value = condition.value;
					if (condition.operator === 'in') {
						if (!Array.isArray(value)) return null;
						return `${field}.in.(${value.map((v) => String(v)).join(',')})`;
					}
					return `${field}.${condition.operator}.${this.serializeFilterValue(value)}`;
				})
				.filter(Boolean)
				.join(',');

			return orParts ? builder.or(orParts) : builder;
		};

		return {
			query: apply(query, this.filters),
			realtime: this.build_realtime_string(this.filters),
			select: to_select
		};
	}

	/**
	 * Fetches all rows from Supabase and hydrates cache.
	 *
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, Required>[]>>} Result containing all matching rows.
	 */
	fetch_all() {
		this.struct.log('Fetching all query rows');
		return attemptAsync(async () => {
			if (!is_online()) {
				this.struct.log('Offline during fetch_all; serving from Dexie cache only');
				await this.pull_dexie();
				return this.reactive;
			}
			const built = this.build();
			const res = await built.query;
			const result = this.struct
				.runTransaction({ data: res.data as any, error: res.error }, 'array', this.required as any)
				.unwrap();

			await this.pruneStaleDexieRows(result as any);

			const hydrated = this.struct.Hydrate(result as any, this.required as any, (data) =>
				this.matches_filter(data as any)
			) as SupaStructData<Schema, RowName, Required>[];

			return hydrated.filter((data) => this.matches_filter(data));
		});
	}

	/**
	 * Fetches a specific page directly from Supabase.
	 *
	 * @param {number} page - 1-based page number.
	 * @param {number} size - Items per page.
	 * @returns {ReturnType<typeof attemptAsync<PaginatedResponse<SupaStructData<Schema, RowName, Required>>>>} Paginated result.
	 */
	fetch_paginated(page: number, size: number) {
		this.struct.log('Fetching paginated query rows', { page, size });
		return attemptAsync(async () => {
			if (!is_online()) {
				this.struct.log('Offline during fetch_paginated; serving from Dexie cache only');
				await this.pull_dexie();
				const reactive = this.reactive;
				const from = (page - 1) * size;
				const to = from + size;
				return {
					data: reactive.slice(from, to),
					count: reactive.length
				};
			}
			const built = this.build();
			const from = (page - 1) * size;
			const to = from + size - 1;
			const res = await built.query.range(from, to);
			const result = this.struct
				.runTransaction({ data: res.data as any, error: res.error }, 'array', this.required as any)
				.unwrap();

			const hydrated = this.struct.Hydrate(result as any, this.required as any, (data) =>
				this.matches_filter(data)
			) as SupaStructData<Schema, RowName, Required>[];

			return {
				data: hydrated.filter((data) => this.matches_filter(data)),
				count: res.count ?? hydrated.length
			};
		});
	}

	/**
	 * Counts rows matching the current query.
	 *
	 * @returns {ReturnType<typeof attemptAsync<number>>} Total count.
	 */
	count() {
		this.struct.log('Counting query rows');
		return attemptAsync(async () => {
			const { count, error } = await this.build('exact').query.limit(0);
			if (error) throw error;
			return count ?? 0;
		});
	}

	/**
	 * Fetches first or last row based on `created_at` ordering.
	 *
	 * @param {'first' | 'last'} type - Selection direction.
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, Required> | null>>} Selected row.
	 */
	private fetch_single(type: 'first' | 'last') {
		this.struct.log('Fetching single query row', { type });
		return attemptAsync(async () => {
			const built = this.build();
			const res = await built.query.limit(1).order('created_at', {
				ascending: type === 'first' ? true : false
			});
			const result = this.struct
				.runTransaction({ data: res.data as any, error: res.error }, 'array', this.required as any)
				.unwrap();

			const hydrated = this.struct.Hydrate(result as any, this.required as any, (data) =>
				this.matches_filter(data)
			) as SupaStructData<Schema, RowName, Required>[];

			return hydrated.find((data) => this.matches_filter(data)) ?? null;
		});
	}

	/**
	 * Fetches earliest row for the current query.
	 *
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, Required> | null>>} Selected row.
	 */
	first() {
		this.struct.log('Fetching first query row');
		return this.fetch_single('first');
	}

	/**
	 * Fetches latest row for the current query.
	 *
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName, Required> | null>>} Selected row.
	 */
	last() {
		this.struct.log('Fetching last query row');
		return this.fetch_single('last');
	}

	/**
	 * Syncs query with cache TTL semantics.
	 *
	 * Flow: pull Dexie -> check query cache freshness -> fetch remote when stale -> upsert query cache row.
	 *
	 * @param {number} ttl - Cache freshness window in milliseconds.
	 * @returns {Promise<any>} Fresh query result.
	 */
	sync(ttl: number) {
		this.struct.log('Syncing query rows with ttl', ttl);
		return this.pull_dexie().then(async () => {
			if (!browser) {
				return this.fetch_all();
			}

			const query_key = stable_stringify({
				schema: this.struct.schema,
				table: this.struct.table,
				filters: this.filters,
				required: this.required.map(String)
			});
			const cache_row_id = `${this.struct.schema}:${this.struct.table}:${query_key}`;
			const cached = await QueryCache.get({
				query: query_key,
				schema: this.struct.schema,
				table: this.struct.table
			}).first();

			if (cached.isOk() && cached.value) {
				if (cached.value.raw.version !== QUERY_CACHE_VERSION) {
					await cached.value.delete();
					// } else if (Date.now() - cached.value.raw.last_sync <= ttl) {
					// 	return this.reactive;
				}
			}

			const built = this.build();
			const res = await built.query;
			const result = this.struct
				.runTransaction({ data: res.data as any, error: res.error }, 'array', this.required as any)
				.unwrap();

			await this.pruneStaleDexieRows(result as any);

			const hydrated = this.struct.Hydrate(result as any, this.required as any, (data) =>
				this.matches_filter(data)
			) as SupaStructData<Schema, RowName, Required>[];

			await QueryCache.upsert({
				query: query_key,
				schema: this.struct.schema,
				table: this.struct.table,
				version: QUERY_CACHE_VERSION,
				required: this.required.map(String).join(','),
				last_sync: Date.now(),
				created_at: new SvelteDate(),
				id: cache_row_id
			});

			return hydrated.filter((data) => this.matches_filter(data));
		});
	}

	/**
	 * Registers a realtime subscription for this query filter.
	 *
	 * @param {(data: SupaStructData<Schema, RowName, Required>, event: 'UPDATE' | 'INSERT' | 'DELETE') => void} [_callback] - Optional event handler.
	 * @returns {() => void} Unsubscribe callback.
	 */
	subscribe(callback?: RealtimeCallback<Schema, RowName>) {
		this.struct.log('Subscribing query to realtime updates');
		const realtime = this.build().realtime;

		const unsub = add_subscription(this.struct.supabase, {
			struct: this.struct,
			filter: realtime as any,
			callback
		});

		return () => {
			this.struct.log('Unsubscribing query from realtime updates');
			void unsub;
		};
	}

	/**
	 * Promise-like interface resolving to full query results.
	 *
	 * @param {(value: Result<SupaStructData<Schema, RowName, Required>[]>) => void} [onfulfilled] - Success callback.
	 * @param {(reason: any) => void} [onrejected] - Failure callback.
	 * @returns {ReturnType<SupaQuery<Schema, RowName, Required, HasDefault>['fetch_all']>} Query result promise wrapper.
	 */
	then(
		onfulfilled?: (value: Result<SupaStructData<Schema, RowName, Required>[]>) => void,
		onrejected?: (reason: any) => void
	) {
		this.struct.log('Awaiting query via then()');
		const res = this.fetch_all();
		res.then(onfulfilled).catch(onrejected);
		return res;
	}

	/**
	 * Sets a default row returned by `single` when query has no match.
	 *
	 * @param {SupaStructData<Schema, RowName, Required>} data - Default fallback row.
	 * @returns {SupaQuery<Schema, RowName, Required, true>} Query instance with default marker.
	 */
	default(data: SupaStructData<Schema, RowName, Required>['raw']) {
		this.struct.log('Setting query default row');
		this._default = data;
		return this as SupaQuery<Schema, RowName, Required, true>;
	}

	/**
	 * Fetches all rows and unwraps the `Result`.
	 *
	 * @returns {SupaStructData<Schema, RowName, Required>[]} Unwrapped rows.
	 */
	unwrap() {
		this.struct.log('Unwrapping query result');
		return this.fetch_all().unwrap();
	}

	/**
	 * Fetches all rows and returns fallback on failure.
	 *
	 * @param {SupaStructData<Schema, RowName, Required>[]} defaultValue - Fallback rows.
	 * @returns {SupaStructData<Schema, RowName, Required>[]} Query rows or fallback.
	 */
	unwrapOr(defaultValue: SupaStructData<Schema, RowName, Required>[]) {
		this.struct.log('Unwrapping query result with fallback', { fallbackSize: defaultValue.length });
		return this.fetch_all().unwrapOr(defaultValue);
	}
}

/**
 * Configuration accepted by `JoinQuery` for left/right projection and join matching behavior.
 */
type JoinConfig<
	Schema extends RowSchemaName,
	RowName extends RowTableNames<Schema>,
	OtherSchema extends RowSchemaName,
	OtherRowName extends RowTableNames<OtherSchema>,
	RequiredA extends keyof RowWithoutArchived<Schema, RowName>,
	RequiredB extends keyof RowWithoutArchived<OtherSchema, OtherRowName>
> = {
	requiredA?: readonly RequiredA[];
	whereB?: Partial<RowWithoutArchived<OtherSchema, OtherRowName>>;
	joinOn?: {
		left: keyof RowWithoutArchived<Schema, RowName>;
		right: keyof RowWithoutArchived<OtherSchema, OtherRowName>;
	};
} & ({ pullB?: true; requiredB?: readonly RequiredB[] } | { pullB: false; requiredB?: never });

/**
 * Join-focused query wrapper for `SupaStruct.join()`.
 *
 * This class performs relation-aware hydration for left-table rows while optionally
 * projecting right-table rows, and supports fetch/pagination/count/sync utilities.
 */
class JoinQuery<
	Schema extends RowSchemaName,
	RowName extends RowTableNames<Schema>,
	OtherSchema extends RowSchemaName,
	OtherRowName extends RowTableNames<OtherSchema>,
	RequiredA extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
		Schema,
		RowName
	>,
	RequiredB extends keyof RowWithoutArchived<OtherSchema, OtherRowName> = keyof RowWithoutArchived<
		OtherSchema,
		OtherRowName
	>,
	HasDefault extends boolean = false
> {
	private _default: SupaStructData<Schema, RowName, RequiredA | 'id'> | null = null;
	private _sort: (
		a: SupaStructData<Schema, RowName, RequiredA | 'id'>,
		b: SupaStructData<Schema, RowName, RequiredA | 'id'>
	) => number = $state((a, b) =>
		String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0
	);
	private _reverse = $state(false);
	private readonly matchedLeftIds = $state(new SvelteSet<string>());

	/**
	 * Creates a join query wrapper between two structs.
	 *
	 * @param {SupaStruct<Schema, RowName>} struct - Left-side struct.
	 * @param {SupaStruct<OtherSchema, OtherRowName>} other - Right-side struct.
	 * @param {JoinConfig<Schema, RowName, OtherSchema, OtherRowName, RequiredA, RequiredB>} [config] - Join behavior configuration.
	 */
	constructor(
		public readonly struct: SupaStruct<Schema, RowName>,
		public readonly other: SupaStruct<OtherSchema, OtherRowName>,
		public readonly config?: JoinConfig<
			Schema,
			RowName,
			OtherSchema,
			OtherRowName,
			RequiredA,
			RequiredB
		>
	) {
		this.struct.log('Initialized JoinQuery', {
			other: String(this.other.table),
			config: this.config
		});
	}

	/**
	 * Normalized required field list for left table projection.
	 */
	private get leftRequired() {
		this.struct.log('Resolving join left required fields');
		const required = (this.struct as any).getEffectiveRequiredFields(
			this.config?.requiredA
		) as readonly (RequiredA | 'id')[];
		return Array.from(new SvelteSet([...required.map(String), 'id'])) as readonly (
			RequiredA | 'id'
		)[];
	}

	/**
	 * Normalized required field list for right table projection.
	 */
	private get rightRequired() {
		this.struct.log('Resolving join right required fields');
		const required = (this.other as any).getEffectiveRequiredFields(
			this.config?.pullB === false ? undefined : this.config?.requiredB
		) as readonly (RequiredB | 'id')[];
		const fields = Array.from(new SvelteSet([...required.map(String), 'id']));
		for (const key of Object.keys(this.config?.whereB ?? {}))
			if (!fields.includes(key)) fields.push(key);
		return fields as readonly (RequiredB | 'id')[];
	}

	/**
	 * Resolves join key mapping from explicit config or known conventions.
	 */
	private getJoinFields() {
		this.struct.log('Resolving join key fields');
		if (this.config?.joinOn) {
			return { left: String(this.config.joinOn.left), right: String(this.config.joinOn.right) };
		}
		const leftKeys = new SvelteSet((this.struct as any).getSchemaRowKeys().map(String));
		const rightKeys = new SvelteSet((this.other as any).getSchemaRowKeys().map(String));
		for (const candidate of [
			{ left: 'id', right: `${String(this.struct.table)}_id` },
			{ left: 'id', right: `${String(this.struct.table)}Id` },
			{ left: 'number', right: `${String(this.struct.table)}_number` },
			{ left: 'number', right: `${String(this.struct.table)}Number` },
			{ left: 'number', right: 'team_number' },
			{ left: 'id', right: 'id' }
		]) {
			if (leftKeys.has(candidate.left) && rightKeys.has(candidate.right)) return candidate;
		}
		return null;
	}

	/**
	 * Deduplicates rows by id.
	 */
	private uniqueById<T extends { id?: string }>(rows: T[]) {
		this.struct.log('Deduplicating rows by id', { count: rows.length });
		const byId = new SvelteMap<string, T>();
		for (const row of rows) if (row?.id) byId.set(String(row.id), row);
		return Array.from(byId.values());
	}

	/**
	 * Splits a Supabase join payload into left and right row collections.
	 */
	private splitJoinRows(items: unknown[]) {
		const leftRows: PartialRow<Schema, RowName, RequiredA | 'id'>[] = [];
		const rightRows: PartialRow<OtherSchema, OtherRowName, RequiredB | 'id'>[] = [];

		for (const item of items as unknown as Array<Record<string, unknown>>) {
			const nested = item[String(this.other.table)];
			const { [String(this.other.table)]: _nested, ...leftOnly } = item;
			const rightCandidates = Array.isArray(nested) ? nested : nested ? [nested] : [];
			if (!rightCandidates.length) continue;

			leftRows.push(leftOnly as PartialRow<Schema, RowName, RequiredA | 'id'>);
			for (const candidate of rightCandidates) {
				if (
					candidate &&
					typeof candidate === 'object' &&
					(candidate as { archived?: boolean }).archived !== true
				) {
					rightRows.push(candidate as PartialRow<OtherSchema, OtherRowName, RequiredB | 'id'>);
				}
			}
		}

		return { leftRows, rightRows };
	}

	/**
	 * Hydrates left/right join rows and updates tracked matched-left ids.
	 */
	private hydrateJoin(
		leftRows: PartialRow<Schema, RowName, RequiredA | 'id'>[],
		rightRows: PartialRow<OtherSchema, OtherRowName, RequiredB | 'id'>[]
	) {
		this.struct.log('Hydrating join result sets', {
			left: leftRows.length,
			right: rightRows.length
		});
		this.matchedLeftIds.clear();
		for (const row of leftRows) this.matchedLeftIds.add(String(row.id));
		const left = this.struct.Hydrate(
			leftRows,
			this.leftRequired as readonly RequiredA[]
		) as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
		const right =
			this.config?.pullB === false
				? []
				: (this.other.Hydrate(
						rightRows,
						this.rightRequired as readonly RequiredB[]
					) as SupaStructData<OtherSchema, OtherRowName, RequiredB | 'id'>[]);
		return { left, right };
	}

	/**
	 * Attempts join hydration from Dexie-backed local data first.
	 */
	private async pull_dexie() {
		this.struct.log('Pulling join data from Dexie cache');
		const dexieA = this.struct.getDexie(this.struct.getSchemaDefinition().Row as any);
		const dexieB = this.other.getDexie(this.other.getSchemaDefinition().Row as any);
		if (!dexieA || !dexieB) {
			this.matchedLeftIds.clear();
			return [] as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
		}

		const rightResult = await dexieB.get((this.config?.whereB ?? {}) as any);
		if (rightResult.isErr() || !rightResult.value.length) {
			this.matchedLeftIds.clear();
			return [] as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
		}
		const rightRows = rightResult.value.map((row) => row.raw) as PartialRow<
			OtherSchema,
			OtherRowName,
			RequiredB | 'id'
		>[];
		if (this.config?.pullB !== false)
			this.other.Hydrate(rightRows, this.rightRequired as readonly RequiredB[]);

		const joinFields = this.getJoinFields();
		if (!joinFields) {
			this.matchedLeftIds.clear();
			return [] as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
		}

		const leftAll = await dexieA.all();
		if (leftAll.isErr()) {
			this.matchedLeftIds.clear();
			return [] as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
		}

		const rightJoinValues = new SvelteSet(
			rightRows
				.map((row) => {
					const value = (row as any)[joinFields.right];
					return value === undefined || value === null ? null : String(value);
				})
				.filter((value): value is string => value !== null)
		);
		const leftRows = leftAll.value
			.map((item) => item.raw as PartialRow<Schema, RowName, RequiredA | 'id'>)
			.filter((row) => {
				const value = (row as any)[joinFields.left];
				return value !== undefined && value !== null && rightJoinValues.has(String(value));
			});

		return this.hydrateJoin(this.uniqueById(leftRows), this.uniqueById(rightRows)).left;
	}

	/**
	 * Builds the Supabase join query for current join configuration.
	 */
	private build(count?: 'exact' | 'estimated' | 'planned') {
		this.struct.log('Building join query', { count });
		const leftFields = Array.from(
			new SvelteSet([...this.leftRequired.map(String), 'id', 'archived'])
		);
		const rightFields = Array.from(
			new SvelteSet([...this.rightRequired.map(String), 'id', 'archived'])
		);
		let query = this.struct.supabase
			.schema(this.struct.schema)
			.from(this.struct.table)
			.select(
				`${leftFields.join(',')}, ${String(this.other.table)}!inner(${rightFields.join(',')})`,
				{ count }
			)
			.filter('archived', 'eq', false)
			.filter(`${String(this.other.table)}.archived`, 'eq', false);
		for (const [key, value] of Object.entries(this.config?.whereB ?? {})) {
			query = query.filter(`${String(this.other.table)}.${key}`, 'eq', value as any);
		}
		return query;
	}

	/**
	 * Reactive left-table rows currently matched by this join.
	 */
	get reactive(): SupaStructData<Schema, RowName, RequiredA | 'id'>[] {
		const rows = Array.from(this.struct.cache.values()).filter((item) =>
			this.matchedLeftIds.has(String(item.id))
		);
		return rows.sort(
			(a, b) => (this._reverse ? -1 : 1) * this._sort(a as any, b as any)
		) as SupaStructData<Schema, RowName, RequiredA | 'id'>[];
	}

	/**
	 * First matched row or default fallback.
	 */
	get single(): HasDefault extends true
		? SupaStructData<Schema, RowName, RequiredA>
		: SupaStructData<Schema, RowName, RequiredA> | null {
		const [first] = this.reactive;
		if (first) return first as any;
		if (this._default)
			return this.struct.Generator(this._default as any, {
				required: this.leftRequired as readonly RequiredA[],
				cache: false
			});
		return null as any;
	}

	/**
	 * Pagination facade for join queries.
	 */
	get paginated() {
		return {
			page: async (page: number, size: number) => {
				const res = await this.fetch_paginated(page, size);
				if (res.isErr()) throw res.error;
				return res.value;
			}
		};
	}

	/**
	 * Sets sort comparator for matched rows.
	 */
	sort(
		sort: (
			a: SupaStructData<Schema, RowName, RequiredA | 'id'>,
			b: SupaStructData<Schema, RowName, RequiredA | 'id'>
		) => number
	) {
		this.struct.log('Setting join sort comparator');
		this._sort = sort;
		return this;
	}
	/**
	 * Toggles reverse sort ordering.
	 */
	reverse() {
		this.struct.log('Toggling join reverse sort order');
		this._reverse = !this._reverse;
		return this;
	}

	/**
	 * Fetches all matched left-table rows for this join.
	 */
	fetch_all() {
		this.struct.log('Fetching all join rows');
		return attemptAsync(async () => {
			if (!is_online()) {
				this.struct.log('Offline during join fetch_all; serving from Dexie cache only');
				await this.pull_dexie();
				return this.reactive;
			}
			const res = await this.build();
			if (res.error) throw res.error;
			const { leftRows, rightRows } = this.splitJoinRows((res.data ?? []) as unknown[]);
			return this.hydrateJoin(this.uniqueById(leftRows), this.uniqueById(rightRows)).left;
		});
	}

	/**
	 * Fetches a page of join-matched rows from Supabase.
	 */
	fetch_paginated(page: number, size: number) {
		this.struct.log('Fetching paginated join rows', { page, size });
		return attemptAsync(async () => {
			if (!is_online()) {
				this.struct.log('Offline during join fetch_paginated; serving from Dexie cache only');
				await this.pull_dexie();
				const reactive = this.reactive;
				const from = (page - 1) * size;
				const to = from + size;
				return {
					data: reactive.slice(from, to),
					count: reactive.length
				};
			}
			const from = (page - 1) * size;
			const to = from + size - 1;
			const res = await this.build('exact').range(from, to);
			if (res.error) throw res.error;
			const { leftRows, rightRows } = this.splitJoinRows((res.data ?? []) as unknown[]);
			const hydrated = this.hydrateJoin(this.uniqueById(leftRows), this.uniqueById(rightRows)).left;
			return { data: hydrated, count: res.count ?? hydrated.length };
		});
	}

	/**
	 * Counts matched join rows.
	 */
	count() {
		this.struct.log('Counting join rows');
		return attemptAsync(async () => {
			const res = await this.build('exact').limit(0);
			if (res.error) throw res.error;
			return res.count ?? 0;
		});
	}
	/**
	 * Fetches first or last matched join row.
	 */
	fetch_single(type: 'first' | 'last') {
		this.struct.log('Fetching single join row', { type });
		return attemptAsync(async () => {
			const rows = await this.fetch_all();
			if (rows.isErr()) throw rows.error;
			return type === 'first' ? (rows.value[0] ?? null) : (rows.value.at(-1) ?? null);
		});
	}
	/**
	 * Convenience first-row helper.
	 */
	first() {
		this.struct.log('Fetching first join row');
		return this.fetch_single('first');
	}
	/**
	 * Convenience last-row helper.
	 */
	last() {
		this.struct.log('Fetching last join row');
		return this.fetch_single('last');
	}
	/**
	 * Syncs join result with query cache and TTL semantics.
	 */
	sync(ttl: number) {
		this.struct.log('Syncing join query with ttl', ttl);

		return this.pull_dexie().then(async () => {
			if (!browser) return this.fetch_all();
			const query_key = stable_stringify({
				schema: this.struct.schema,
				table: this.struct.table,
				other: this.other.table,
				config: {
					requiredA: this.config?.requiredA?.map(String),
					requiredB:
						this.config?.requiredB === undefined ? undefined : this.config.requiredB.map(String),
					whereB: this.config?.whereB,
					joinOn: this.config?.joinOn,
					pullB: this.config?.pullB ?? true
				}
			});
			const cache_row_id = `${this.struct.schema}:${this.struct.table}:${query_key}`;
			const cached = await QueryCache.get({
				query: query_key,
				schema: this.struct.schema,
				table: this.struct.table
			}).first();
			if (cached.isOk() && cached.value) {
				if (cached.value.raw.version !== QUERY_CACHE_VERSION) await cached.value.delete();
				else if (Date.now() - cached.value.raw.last_sync <= ttl) return this.reactive;
			}
			const hydrated = await this.fetch_all().unwrap();
			await QueryCache.upsert({
				query: query_key,
				schema: this.struct.schema,
				table: this.struct.table,
				version: QUERY_CACHE_VERSION,
				required: this.leftRequired.map(String).join(','),
				last_sync: Date.now(),
				created_at: new SvelteDate(),
				id: cache_row_id
			});
			return hydrated;
		});
	}

	/**
	 * Registers realtime updates for left-table rows in this join.
	 */
	subscribe(callback?: RealtimeCallback<Schema, RowName>) {
		this.struct.log('Subscribing join query to realtime updates');
		if (!callback) return () => {};
		const unsub = add_subscription(this.struct.supabase, {
			struct: this.struct,
			filter: '*',
			callback
		});
		return () => {
			this.struct.log('Unsubscribing join query from realtime updates');
			void unsub;
		};
	}

	/**
	 * Promise-like interface resolving to full join results.
	 */
	then(
		onfulfilled?: (value: Result<SupaStructData<Schema, RowName, RequiredA | 'id'>[]>) => void,
		onrejected?: (reason: any) => void
	) {
		this.struct.log('Awaiting join query via then()');
		const res = this.fetch_all();
		res.then(onfulfilled).catch(onrejected);
		return res;
	}
	/**
	 * Sets default fallback row for `single`.
	 */
	default(data: SupaStructData<Schema, RowName, RequiredA | 'id'>) {
		this.struct.log('Setting join query default row');
		this._default = data;
		return this as JoinQuery<
			Schema,
			RowName,
			OtherSchema,
			OtherRowName,
			RequiredA,
			RequiredB,
			true
		>;
	}
	/**
	 * Fetches and unwraps all join results.
	 */
	unwrap() {
		this.struct.log('Unwrapping join query result');
		return this.fetch_all().unwrap();
	}
	/**
	 * Fetches join results with fallback on failure.
	 */
	unwrapOr(defaultValue: SupaStructData<Schema, RowName, RequiredA | 'id'>[]) {
		this.struct.log('Unwrapping join query with fallback', { fallbackSize: defaultValue.length });
		return this.fetch_all().unwrapOr(defaultValue);
	}
}

/**
 * Pagination controller bound to a query result.
 *
 * This helper tracks current page state and keeps stable row ids for page slices
 * so cache updates do not break displayed pagination lists.
 */
class _SupaPagination<
	Schema extends RowSchemaName,
	RowName extends RowTableNames<Schema>,
	Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
		Schema,
		RowName
	>
> {
	/**
	 * Current one-based page number.
	 */
	private _currentPage = $state(1);
	/**
	 * Number of rows requested per page.
	 */
	private _pageSize = $state(10);
	/**
	 * Total number of rows matching the current query.
	 */
	private _totalItems = $state(0);

	/**
	 * Exact row IDs for the active page view, used to avoid stale cache-slice mismatches.
	 */
	private _currentPageIds = $state<string[]>([]);

	/**
	 * Creates a pagination controller bound to a parent struct and query.
	 *
	 * @param {SupaStruct<Schema, RowName>} struct - Owning struct.
	 * @param {(page: number, size: number) => Promise<PaginatedResponse<SupaStructData<Schema, RowName, Required>>>} paginateQuery - Pagination callback.
	 * @example
	 * const pager = new _SupaPagination(struct, paginateFn);
	 */
	constructor(
		private readonly struct: SupaStruct<Schema, RowName>,
		private readonly paginateQuery: (
			page: number,
			size: number
		) => Promise<PaginatedResponse<SupaStructData<Schema, RowName, Required>>>
	) {}

	/**
	 * Current page index (1-based).
	 *
	 * @returns {number} Current page number.
	 * @example
	 * console.log(pager.currentPage);
	 */
	get currentPage() {
		return this._currentPage;
	}

	/**
	 * Current page size.
	 *
	 * @returns {number} Number of rows per page.
	 * @example
	 * console.log(pager.pageSize);
	 */
	get pageSize() {
		return this._pageSize;
	}

	/**
	 * Updates page size and resets to page 1.
	 *
	 * @param {number} value - New page size.
	 * @example
	 * pager.pageSize = 25;
	 */
	set pageSize(value: number) {
		this.struct.log('Updating pagination page size', value);
		this._pageSize = value;
		this._currentPage = 1;
		this.executeFetch();
	}

	/**
	 * Total matching item count for the last paginated request.
	 *
	 * @returns {number} Total number of matching rows.
	 * @example
	 * console.log(pager.totalItems);
	 */
	get totalItems() {
		return this._totalItems;
	}

	/**
	 * Total page count based on `totalItems` and `pageSize`.
	 *
	 * @returns {number} Total page count.
	 * @example
	 * console.log(pager.pages);
	 */
	get pages() {
		return Math.ceil(this._totalItems / this._pageSize) || 1;
	}

	/**
	 * Reactive rows currently visible for the selected page.
	 *
	 * @returns {SupaStructData<Schema, RowName, Required>[]} Current page rows from cache.
	 * @example
	 * const rows = pager.reactive;
	 */
	get reactive(): SupaStructData<Schema, RowName, Required>[] {
		return this._currentPageIds
			.map((id) => this.struct.cache.get(id))
			.filter((item, i, a) => {
				if (!item) return false;
				return a.indexOf(item) === i;
			}) as SupaStructData<Schema, RowName, Required>[];
	}

	/**
	 * Indicates whether a next page exists.
	 *
	 * @returns {boolean} True when current page is below total pages.
	 * @example
	 * if (pager.hasNext) await pager.next();
	 */
	get hasNext() {
		return this._currentPage < this.pages;
	}
	/**
	 * Indicates whether a previous page exists.
	 *
	 * @returns {boolean} True when current page is greater than 1.
	 * @example
	 * if (pager.hasPrev) await pager.prev();
	 */
	get hasPrev() {
		return this._currentPage > 1;
	}

	/**
	 * Moves to the next page and fetches data.
	 *
	 * @returns {Promise<Result<SupaStructData<Schema, RowName, Required>[], Error>>} Page fetch result.
	 * @example
	 * await pager.next();
	 */
	next() {
		this.struct.log('Moving pagination to next page');
		if (this.hasNext) {
			this._currentPage++;
			return this.executeFetch();
		}
		return Promise.resolve(new Ok([])); // Return empty Ok if no next page
	}

	/**
	 * Moves to the previous page and fetches data.
	 *
	 * @returns {Promise<Result<SupaStructData<Schema, RowName, Required>[], Error>>} Page fetch result.
	 * @example
	 * await pager.prev();
	 */
	prev() {
		this.struct.log('Moving pagination to previous page');
		if (this.hasPrev) {
			this._currentPage--;
			return this.executeFetch();
		}
		return Promise.resolve(new Ok([]));
	}

	/**
	 * Moves to a specific page and fetches data.
	 *
	 * @param {number} num - Target page (1-based).
	 * @returns {Promise<Result<SupaStructData<Schema, RowName, Required>[], Error>>} Page fetch result.
	 * @example
	 * await pager.page(3);
	 */
	page(num: number) {
		this.struct.log('Moving pagination to explicit page', num);
		if (num >= 1 && num <= this.pages) {
			this._currentPage = num;
			return this.executeFetch();
		}
		return Promise.resolve(new Ok([]));
	}

	/**
	 * Reusable fetch logic that correctly updates the ID list and total count.
	 *
	 * @returns {Promise<Result<SupaStructData<Schema, RowName, Required>[], Error>>} Page fetch result.
	 * @example
	 * const result = await this.executeFetch();
	 */
	private executeFetch() {
		this.struct.log('Executing pagination fetch', {
			page: this._currentPage,
			size: this._pageSize
		});
		return this.paginateQuery(this._currentPage, this._pageSize)
			.then((res) => {
				this._totalItems = res.count;

				// Only track the IDs for this specific page slice
				this._currentPageIds = res.data.map((item) => String(item.raw.id));

				return new Ok(res.data);
			})
			.catch((err) => {
				return new Err(err instanceof Error ? err : new Error(String(err))) as Result<
					SupaStructData<Schema, RowName, Required>[],
					Error
				>;
			});
	}

	/**
	 * Executing `await query.paginated` fetches the current page.
	 *
	 * @param {(value: Result<SupaStructData<Schema, RowName, Required>[], Error>) => void | PromiseLike<void> | null} [onfulfilled] - Fulfillment handler.
	 * @returns {Promise<Result<SupaStructData<Schema, RowName, Required>[], Error>>} Pagination result.
	 * @example
	 * const result = await query.paginated;
	 */
	then(
		onfulfilled?:
			| ((
					value: Result<SupaStructData<Schema, RowName, Required>[], Error>
			  ) => void | PromiseLike<void>)
			| null
	) {
		this.struct.log('Awaiting pagination fetch via then()');
		return this.executeFetch().then(onfulfilled);
	}
}

/**
 * Typed table adapter for a schema/table pair.
 *
 * A `SupaStructData` wraps raw row data with convenience mutation helpers and
 * keeps object identity stable across cache refreshes.
 *
 * @example
 * const profile = await users.fromId('abc123');
 * await profile.update({ display_name: 'Ada' });
 */
export class SupaStructData<
	Schema extends RowSchemaName,
	RowName extends RowTableNames<Schema>,
	Required extends keyof RowWithoutArchived<Schema, RowName> = keyof RowWithoutArchived<
		Schema,
		RowName
	>,
	UpdateName extends UpdateTableNames<Schema> = Extract<RowName, UpdateTableNames<Schema>>
> {
	/**
	 * Raw row payload backing this wrapper.
	 *
	 * This value is reactive and updated in place as row fields change.
	 */
	public readonly raw: PartialRow<Schema, RowName, Required> = $state({} as any);

	/**
	 * Creates a wrapped row instance tied to a parent struct.
	 *
	 * @param {SupaStruct<Schema, RowName>} struct - Parent struct.
	 * @param {PartialRow<Schema, RowName, Required>} data - Initial row data.
	 * @param {{ is_temporary?: boolean }} [config] - Optional local-only metadata.
	 * @example
	 * const item = new SupaStructData(struct, row);
	 */
	constructor(
		/**
		 * Parent struct that owns this row wrapper and its cache.
		 */
		public readonly struct: SupaStruct<Schema, RowName>,
		data: PartialRow<Schema, RowName, Required>,
		/**
		 * Optional wrapper metadata, including whether this row is a local temporary draft.
		 */
		public readonly config?: { is_temporary?: boolean }
	) {
		this.struct.log('Initializing SupaStructData row wrapper', {
			id: data.id
		});
		this.raw = data;
	}
	/**
	 * Row identifier convenience accessor.
	 *
	 * @returns {string} Row id.
	 */
	get id() {
		return this.raw.id;
	}

	/**
	 * Indicates whether this row is a temporary local placeholder.
	 *
	 * @returns {boolean} True when the row is a transient draft.
	 */
	get temp() {
		return this.config?.is_temporary ?? false;
	}

	/**
	 * Row creation timestamp as a reactive `SvelteDate`.
	 *
	 * @returns {SvelteDate} Reactive date wrapper.
	 * @example
	 * console.log(item.created.toISOString());
	 */
	get created() {
		return new SvelteDate(this.raw.created_at);
	}

	/**
	 * Removes the current row from the local cache and Dexie store without touching the server.
	 *
	 * @returns {Promise<Result<void, SupaError>>} Local deletion result.
	 */
	_deleteLocal() {
		this.struct.log('Deleting row locally', { id: this.id });
		return attemptAsync(async () => {
			this.struct['purge_cache']([String(this.id)]);
			const dexie = this.struct['getDexie'](this.struct['getSchemaDefinition']().Row as any);

			if (dexie) {
				await dexie['remove'](String(this.id));
			}
		});
	}

	/**
	 * Updates this row in Supabase and merges the returned row into local state.
	 *
	 * @param {Partial<Insert<Schema, UpdateName>>} updates - Patch payload.
	 * @returns {ReturnType<typeof attemptAsync<SupaStructData<Schema, RowName>>>} Async result wrapper.
	 * @example
	 * await item.update({ archived: true });
	 */
	update(updates: Partial<UpdateWithoutArchived<Schema, UpdateName>>) {
		this.struct.log('Updating row', {
			id: this.id,
			updates
		});
		return attemptAsync<SupaStructData<Schema, RowName, Required>, SupaError>(async () => {
			if (!is_online()) {
				this.struct.log('Offline: Skipping Supabase update and only updating local cache');
				Object.assign(this.raw, updates);
				this.struct['set_in_cache'](this as any);
				const offline_updates = await OfflineUpdates.all();
				if (offline_updates.isErr()) {
					throw new SupaError(
						'offline',
						'Failed to retrieve offline updates: ' + offline_updates.error.message
					);
				}
				const [last_update] = offline_updates.value.reverse();
				if (
					last_update &&
					last_update.raw.action === 'update' &&
					last_update.raw.target_id === this.id
				) {
					await last_update.update({
						data: { ...last_update.raw.data, ...updates } as any
					});
					return this;
				}
				await OfflineUpdates.new({
					table: this.struct.table,
					schema: this.struct.schema,
					data: { ...this.raw, ...updates } as any,
					action: 'update',
					target_id: this.id,
					id: `${Math.floor(Math.random() * 1000000)}-${Date.now()}`,
					created_at: new SvelteDate()
				});
				return this;
			}

			const res = await this.struct.supabase
				.schema(this.struct.schema)
				.from(this.struct.table)
				.update(updates as any)
				.filter('id', 'eq', this.id);

			this.struct
				.runTransaction(
					{
						data: res.data as any,
						error: res.error
					},
					'null'
				)
				.unwrap();
			Object.assign(this.raw, updates);
			this.struct['set_in_cache'](this as any);
			return this;
		});
	}

	/**
	 * Deletes this row from Supabase.
	 *
	 * @returns {ReturnType<typeof attemptAsync<boolean>>} Async result wrapper.
	 * @example
	 * await item.delete();
	 */
	delete() {
		this.struct.log('Deleting row', { id: this.id });
		return attemptAsync<boolean, SupaError>(async () => {
			if (!is_online()) {
				this.struct.log('Offline: Skipping Supabase delete and only updating local cache');
				await this._deleteLocal();
				await OfflineUpdates.new({
					table: this.struct.table,
					schema: this.struct.schema,
					data: { ...this.raw } as any,
					action: 'delete',
					id: `${Math.floor(Math.random() * 1000000)}-${Date.now()}`,
					target_id: this.id,
					created_at: new SvelteDate()
				});
				return true;
			}

			const res = await this.struct.supabase
				.schema(this.struct.schema)
				.from(this.struct.table)
				.delete()
				.filter('id', 'eq', this.id);

			this.struct
				.runTransaction(
					{
						data: res.data as any,
						error: res.error
					},
					'null'
				)
				.unwrap();
			this.struct['purge_cache']([String(this.id)]);
			const dexie = this.struct['getDexie'](this.struct['getSchemaDefinition']().Row as any);
			if (dexie) {
				await dexie['remove'](String(this.id));
			}
			return true;
		});
	}
}
