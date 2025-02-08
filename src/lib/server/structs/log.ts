import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import { z } from 'zod';

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
}

export const _logTable = Logs.Log.table;
