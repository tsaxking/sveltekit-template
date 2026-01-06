import { attemptAsync } from 'ts-utils/check';
import { type DataAction, type PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { Table } from '../db/table';
import { Batch } from 'ts-utils/batch';
import { em } from '../db';
import type { Blank, Struct } from './struct';

export namespace StructBatching {
	const table = new Table('struct_batching', {
		struct: 'string',
		type: 'string',
		data: 'unknown',
		date: 'date'
	});

	export type Batch = typeof table.sample;

	export type StructBatch = {
		struct: Struct<Blank>;
		type: DataAction | PropertyAction | string;
		data: unknown;
		date?: Date;
	};

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
				batcher.add(item);
			}
		}
	});

	const batcher = new Batch(
		async (items: Batch[]) => {
			log(`Sending batch of ${items.length} struct updates...`);
			const res = await fetch('/api/struct/batch', {
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

	export const add = (...structBatch: StructBatch[]) => {
		return attemptAsync(async () => {
			const items = await Promise.all(
				structBatch.map((b) =>
					table
						.new({
							struct: b.struct.data.name,
							type: b.type,
							data: b.data,
							date: b.date ?? new Date()
						})
						.unwrap()
				)
			);

			const res = await Promise.all(items.map((i) => batcher.add(i).unwrap()));
			await Promise.all(items.map((i) => i.delete()));
			return res.map((r) => ({
				message: r.message,
				success: r.success,
				data: r.data
			}));
		});
	};
}
