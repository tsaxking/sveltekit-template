import { attemptAsync } from 'ts-utils/check';
import { Table } from '../db/table';

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

	export const get = (key: string) => {
		return attemptAsync(async () => {
			if (!__APP_ENV__.struct_cache.enabled) {
				return null;
			}
			const record = await table.fromProperty('key', key, { pagination: false }).unwrap();
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
			const record = await table.fromProperty('key', key, { pagination: false }).unwrap();
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

	export const clear = (key: string) => {
		return attemptAsync(async () => {
			const record = await table.fromProperty('key', key, { pagination: false }).unwrap();
			const res = record.data[0];
			if (res) {
				await res.delete().unwrap();
				log(`Cache cleared for key: ${key}`, res.data);
			}
		});
	};
}
