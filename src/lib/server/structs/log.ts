/* eslint-disable @typescript-eslint/no-explicit-any */
import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';
import { DB } from '../db';
import { and, not, sql, or } from 'drizzle-orm';

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
			| 'restore-archive'
			| 'set-attributes'
			| 'add-attributes'
			| 'remove-attributes'
			| 'delete'
			| 'set-universe';
		message: string;
	}) => Log.new(config);

	export const search = (config: {
		accountId?: string | null;
		type?: string | null;
		dataId?: string | null;
		struct?: string | null;
		message?: string | null;
		offset: number;
		limit: number;
	}) => {
		return attemptAsync(async () => {
			const parseConditions = (column: any, value: string | null | undefined) => {
				if (!value) return undefined;

				const parts = value.split('&'); // Handle multiple conditions
				const includes: any[] = [];
				const excludes: any[] = [];

				for (const part of parts) {
					if (part.startsWith('!')) {
						excludes.push(not(sql`${column} ILIKE ${'%' + part.slice(1) + '%'}`));
					} else {
						includes.push(sql`${column} ILIKE ${'%' + part + '%'}`);
					}
				}

				if (includes.length > 0 && excludes.length > 0) {
					return and(...includes, ...excludes);
				} else if (includes.length > 0) {
					return or(...includes);
				} else {
					return and(...excludes);
				}
			};

			const condition = and(
				parseConditions(Log.table.accountId, config.accountId),
				parseConditions(Log.table.type, config.type),
				parseConditions(Log.table.dataId, config.dataId),
				parseConditions(Log.table.struct, config.struct),
				parseConditions(Log.table.message, config.message)
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
