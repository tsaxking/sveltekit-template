import { attemptAsync } from 'ts-utils/check';
import { type DataAction, type PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { Table } from '../db/table';
import { Batch } from 'ts-utils/batch';
import { em } from '../db';

export namespace StructBatching {
	const table = new Table('struct_batching', {
		struct: 'string',
		type: 'string',
		data: 'unknown',
		date: 'date'
	});

	export type Batch = typeof table.sample;

	const log = (...args: unknown[]) => {
		if (__APP_ENV__.struct_batching.debug) {
			console.log('[StructBatching]', ...args);
		}
	};

	em.on('init', async () => {
		const data = await table.all({ pagination: false });
		if (data.isOk()) {
			log(`Processing ${data.value.data.length} pending struct batching items...`);
			for (const item of data.value.data) {
				batch.add(item);
			}
		}
	});

	const batch = new Batch(
		async (items: Batch[]) => {
			log(`Sending batch of ${items.length} struct updates...`);
			console.log(items);
			const res = await fetch('/struct/batch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(
					items.map((i) => ({
						id: i.data.id,
						struct: i.data.struct,
						type: i.data.type,
						data: i.data.data,
						date: i.data.date
					}))
				)
			}).then((r) => r.json());

			// If we got here, then fetch succeeded and server is running, therefore we can delete the items.
			await Promise.all(items.map((i) => i.delete()));

			console.log(res);

			return z
				.array(
					z.object({
						id: z.string(),
						success: z.boolean(),
						message: z.string().optional(),
						data: z.unknown().optional()
					})
				)
				.parse(res);
		},
		{
			batchSize: __APP_ENV__.struct_batching.batch_size,
			interval: __APP_ENV__.struct_batching.interval,
			limit: __APP_ENV__.struct_batching.limit,
			timeout: __APP_ENV__.struct_batching.timeout
		}
	);

	export const add = (
		struct: string,
		type: DataAction | PropertyAction | string,
		data: unknown,
		date?: Date
	) => {
		return attemptAsync(async () => {
			const item = await table
				.new({
					struct,
					type,
					data,
					date: date ?? new Date()
				})
				.unwrap();

			const res = await batch.add(item).unwrap();
			item.delete();
			return {
				message: res.message,
				success: res.success,
				data: res.data
			};
		});
	};
}
