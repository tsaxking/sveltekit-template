import { attempt } from 'ts-utils/check';
import { Struct } from './index';
import { type DataAction, type PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { Batch } from 'ts-utils/batch';

const batcher = new Batch(
	async (
		data: {
			struct: string;
			type: string;
			data: unknown;
			id: string;
			date: string;
		}[]
	) => {
		// Send batch to server
		try {
			const res = await fetch('/struct/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			}).then((r) => r.json());

			// Parse server response
			const parsed = z
				.array(
					z.object({
						id: z.string(),
						success: z.boolean(),
						message: z.string().optional(),
						data: z.unknown().optional()
					})
				)
				.safeParse(res);

			if (!parsed.success) {
				console.warn('Invalid server response for struct updates:', res);
				return [];
			}

			return parsed.data;
		} catch (err) {
			console.warn('struct update send failed', err);
			return [];
		}
	},
	{
		...__APP_ENV__.struct_batching
	}
);

export const add = batcher.add.bind(batcher);

/**
 * The current version for struct updates stored in localStorage
 *
 * @type {1}
 */
const STRUCT_UPDATE_VERSION = 1;

/**
 * Batch update schema for struct updates
 *
 * @type {*}
 */
const structUpdateSchema = z.object({
	struct: z.string(),
	type: z.string(),
	data: z.unknown(),
	id: z.string(),
	date: z.string()
});

/**
 * Retrieves all cached struct updates from localStorage
 *
 * @returns {*}
 */
export const getStructUpdates = () => {
	return attempt(() => {
		const data = window.localStorage.getItem(`struct-updates-v${STRUCT_UPDATE_VERSION}`);
		if (!data) return [];

		const parsed = z.array(structUpdateSchema).parse(JSON.parse(data));

		const now = Date.now();
		const DAY_MS = 1000 * 60 * 60 * 24;

		const valid = parsed.filter((u) => {
			const time = new Date(u.date).getTime();
			return now - time <= DAY_MS;
		});

		// Clean expired from localStorage
		if (valid.length !== parsed.length) {
			window.localStorage.setItem(
				`struct-updates-v${STRUCT_UPDATE_VERSION}`,
				JSON.stringify(valid)
			);
		}

		return valid;
	});
};

/**
 * Saves a struct update using the batcher (will automatically batch and send to server)
 *
 * @param {{
 * 	struct: string;
 * 	type: string;
 * 	data: unknown;
 * 	id: string;
 * }} data
 * @returns {*}
 */
export const saveStructUpdate = (data: {
	struct: string;
	type: string;
	data: unknown;
	id: string;
}) => {
	return attempt(() => {
		const updateData = {
			...data,
			date: new Date(Struct.getDate()).toISOString()
		};

		// Add to batcher which will handle batching and sending automatically
		batcher.add(updateData);

		return updateData;
	});
};

/**
 * Deletes a struct update from localStorage, this will not send the update to the server
 *
 * @param {string} id
 * @returns {*}
 */
export const deleteStructUpdate = (id: string) => {
	return attempt(() => {
		const arr = getStructUpdates()
			.unwrap()
			.filter((u) => u.id !== id);
		window.localStorage.setItem(`struct-updates-v${STRUCT_UPDATE_VERSION}`, JSON.stringify(arr));

		return arr;
	});
};

/**
 * Manually flush the batcher (force send all pending items)
 *
 * @returns {Promise<unknown[]>}
 */
export const sendUpdates = () => {
	return batcher.flush();
};

/**
 * Starts the batcher (no need for manual loop since Batch class handles timing)
 *
 * @param {boolean} browser - Whether we're in browser environment
 * @returns {void}
 */
export const startBatchUpdateLoop = (browser: boolean) => {
	if (browser) {
		batcher.start();
	}
};

/**
 * Clears all struct updates from localStorage, this will not send the updates to the server
 *
 * @returns {*}
 */
export const clearStructUpdates = () => {
	return attempt(() => {
		window.localStorage.removeItem(`struct-updates-v${STRUCT_UPDATE_VERSION}`);
		return [];
	});
};

/**
 * Batch update type - used for custom batches
 *
 * @typedef {BatchUpdate}
 * @template {DataAction | PropertyAction} T
 */
export type BatchUpdate<_T extends DataAction | PropertyAction> = {
	struct: string;
	type: DataAction | PropertyAction;
	data: unknown;
	id: string;
	date: string;
};

/**
 * This isn't currently implemented, but this is a placeholder for a batch send function, rather than just storing it all in cache
 * @deprecated
 * @param {{
 * 	struct: string;
 * 	type: DataAction | PropertyAction;
 * 	data: unknown;
 * 	id: string;
 * 	date: string;
 * }[]} data
 */
export const sendBatch = (
	_data: {
		struct: string;
		type: DataAction | PropertyAction;
		data: unknown;
		id: string;
		date: string;
	}[]
) => {};
