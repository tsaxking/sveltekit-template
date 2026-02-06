/**
 * @fileoverview Client-side struct cache backed by IndexedDB.
 *
 * Stores key/value entries with optional expiration to speed up struct reads.
 *
 * @example
 * import { StructCache } from '$lib/services/struct/cache';
 * await StructCache.set('account:123', account, { expires: new Date(Date.now() + 60000) });
 */
import { attemptAsync } from 'ts-utils/check';
import { Table } from '../db/table';

/**
 * Cache helpers for struct data.
 */
export namespace StructCache {
	const table = new Table('struct_cache', {
		key: 'string',
		value: 'unknown',
		expires: 'date'
	});

	const log = (...data: unknown[]) => {
		if (__APP_ENV__.struct_cache.debug) {
			console.log('[StructCache]', ...data);
		}
	};

	/**
	 * Retrieves a cached value by key.
	 *
	 * @param {string} key - Cache key.
	 */
	export const get = (key: string) => {
		return attemptAsync(async () => {
			if (!__APP_ENV__.struct_cache.enabled) {
				return null;
			}
			const record = await table.get({ key }, { pagination: false }).unwrap();
			const [res] = record.data;
			if (!res) return null;
			if (res.data.expires && res.data.expires < new Date()) {
				// expired
				res.delete();
				log(`Cache expired for key: ${key}`, res.data);
				return null;
			}
			log(`Cache hit for key: ${key}`, res.data);
			return res.data.value;
		});
	};

	/**
	 * Stores a cached value.
	 *
	 * @param {string} key - Cache key.
	 * @param {unknown} value - Value to store.
	 * @param {{ expires: Date }} config - Expiration configuration.
	 */
	export const set = (
		key: string,
		value: unknown,
		config: {
			expires: Date;
		}
	) => {
		return attemptAsync(async () => {
			if (!__APP_ENV__.struct_cache.enabled) {
				return value;
			}
			const record = await table.get({ key }, { pagination: false }).unwrap();
			const res = record.data[0];
			if (res) {
				await res
					.set({
						...res.data,
						value
					})
					.unwrap();
				log(`Cache updated for key: ${key}`, res.data);
				return res.data.value;
			} else {
				await table
					.new({
						key,
						value,
						expires: config.expires
					})
					.unwrap();
				log(`Cache set for key: ${key}`, { key, value, expires: config.expires });
				return value;
			}
		});
	};

	/**
	 * Clears a cached value by key.
	 *
	 * @param {string} key - Cache key.
	 */
	export const clear = (key: string) => {
		return attemptAsync(async () => {
			const record = await table.get({ key }, { pagination: false }).unwrap();
			const res = record.data[0];
			if (res) {
				await res.delete().unwrap();
				log(`Cache cleared for key: ${key}`, res.data);
			}
		});
	};
}
