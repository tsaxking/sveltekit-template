import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';
import { DB } from '../db';
import { and, eq, sql } from 'drizzle-orm';

export namespace Logs {
	export const Log = new Struct({
		name: 'logs',
		structure: {
			dataId: text('data_id').notNull(),
			accountId: text('account_id').notNull(),
			type: text('type').notNull(),
			message: text('message').notNull(),
			struct: text('struct').notNull()
		},
		validators: {
			type: (t) =>
				z
					.enum([
						'delete-version',
						'restore-version',
						'create',
						'update',
						'archive',
						'restore',
						'delete',
						'set-universe'
						// 'set-attributes',
					])
					.safeParse(t).success
		}
	});

	export type LogData = typeof Log.sample;

	export const log = (config: {
		struct: string;
		dataId: string;
		accountId: string;
		type:
			| 'delete-version'
			| 'restore-version'
			| 'create'
			| 'update'
			| 'archive'
			| 'restore'
			| 'delete'
			| 'set-universe';
		message: string;
	}) => Log.new(config);

	export const search = (config: {
		accountId: string | null | undefined;
		type: string | null | undefined;
		dataId: string | null | undefined;
		struct: string | null | undefined;
		message: string | null | undefined;
		offset: number;
		limit: number;
	}) => {
		return attemptAsync(async () => {
			const condition = and(
				config.accountId ? eq(Log.table.accountId, config.accountId) : undefined,
				config.type ? eq(Log.table.type, config.type) : undefined,
				config.dataId ? eq(Log.table.dataId, config.dataId) : undefined,
				config.struct ? eq(Log.table.struct, config.struct) : undefined,
				config.message ? eq(Log.table.message, config.message) : undefined
			);
			const res = await DB.select()
				.from(Log.table)
				.where(condition)
				.limit(config.limit)
				.orderBy(sql`${Log.table.created}::timestamptz DESC`)
				.offset(config.offset);

			const count = await DB.select()
				.from(Log.table)
				.where(condition)
				.then((r) => r.length);

			return { logs: res.map((l) => Log.Generator(l)), count };
		});
	};
}

export const _logTable = Logs.Log.table;
