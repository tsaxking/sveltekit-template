import { Loop } from 'ts-utils/loop';
import { attempt, attemptAsync } from 'ts-utils/check';
import { Struct } from './index';
import { type DataAction, type PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

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
 * Saves a struct update to localStorage, this will not send the update to the server
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
		const now = Date.now();
		const DAY_MS = 1000 * 60 * 60 * 24;

		// Get and prune expired updates first
		const arr = getStructUpdates()
			.unwrap()
			.filter((u) => now - new Date(u.date).getTime() <= DAY_MS);

		// Add new update
		arr.push({
			...data,
			date: new Date(Struct.getDate()).toISOString()
		});

		window.localStorage.setItem(`struct-updates-v${STRUCT_UPDATE_VERSION}`, JSON.stringify(arr));
		return arr;
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
 * Sends all updates that are due to the server in a batch operation, this will not save them to localStorage
 *
 * @param {boolean} browser
 * @param {number} threshold
 * @returns {*}
 */
export const sendUpdates = (browser: boolean, threshold: number) => {
	return attemptAsync(async () => {
		if (!browser) return;

		const all = getStructUpdates().unwrap();
		if (!all.length) return [];

		const due = all.filter((u) => Struct.getDate() - new Date(u.date).getTime() >= threshold);
		if (!due.length) return [];

		let res: unknown;
		try {
			res = await fetch('/struct/batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(due)
			}).then((r) => r.json());
		} catch (err) {
			// Network failure – keep everything
			console.warn('struct update send failed, keeping all local data', err);
			return [];
		}

		// Parse server response (optional: validate here)
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

		// Remove all items that were sent, regardless of server result
		const remaining = all.filter((a) => !due.find((d) => d.id === a.id));
		window.localStorage.setItem(
			`struct-updates-v${STRUCT_UPDATE_VERSION}`,
			JSON.stringify(remaining)
		);

		return parsed.data;
	});
};

/**
 * Starts a loop that sends updates to the server at a specified interval
 *
 * @param {boolean} browser
 * @param {number} interval
 * @param {number} threshold
 * @returns {*}
 */
export const startBatchUpdateLoop = (browser: boolean, interval: number, threshold: number) => {
	const l = new Loop<{
		error: Error;
	}>(async () => {
		const res = await sendUpdates(browser, threshold);
		if (res.isErr()) {
			console.error(res.error);
			l.emit('error', res.error);
		}
	}, interval);
	l.start();
	return l;
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
type BatchUpdate<T extends DataAction | PropertyAction> = {
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
	data: {
		struct: string;
		type: DataAction | PropertyAction;
		data: unknown;
		id: string;
		date: string;
	}[]
) => {};
