/**
 * @fileoverview Log struct and search helpers for auditing changes.
 *
 * Provides a log struct with validated action types and a search utility with
 * include/exclude filters.
 *
 * @example
 * import { Logs } from '$lib/server/structs/log';
 * await Logs.log({
 *   struct: 'account',
 *   dataId: '123',
 *   accountId: 'abc',
 *   type: 'update',
 *   message: 'Updated profile'
 * });
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';
import { DB } from '../db';
import { and, not, sql, or } from 'drizzle-orm';
import structRegistry from '../services/struct-registry';

export namespace Logs {
	/**
	 * Log record.
	 *
	 * @property {string} dataId - ID of the data record.
	 * @property {string} accountId - Account that performed the action.
	 * @property {string} type - Action type.
	 * @property {string} message - Log message.
	 * @property {string} struct - Struct name.
	 */
	export const Log = new Struct({
		name: 'logs',
		structure: {
			/** ID of the data record. */
			dataId: text('data_id').notNull(),
			/** Account that performed the action. */
			accountId: text('account_id').notNull(),
			/** Action type. */
			type: text('type').notNull(),
			/** Log message. */
			message: text('message').notNull(),
			/** Struct name. */
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
						'set-attributes',
						'add-attributes',
						'remove-attributes'
					])
					.safeParse(t).success
		}
	});

	structRegistry.register(Log);

	export type LogData = typeof Log.sample;

	/**
	 * Creates a log entry.
	 *
	 * @param {{ struct: string; dataId: string; accountId: string; type: 'delete-version'|'restore-version'|'create'|'update'|'archive'|'restore-archive'|'set-attributes'|'add-attributes'|'remove-attributes'|'delete'; message: string }} config
	 */
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
			| 'delete';
		message: string;
	}) => Log.new(config);

	/**
	 * Searches logs with include/exclude filters and pagination.
	 *
	 * @param {{ accountId?: string | null; type?: string | null; dataId?: string | null; struct?: string | null; message?: string | null; offset: number; limit: number }} config
	 */
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
