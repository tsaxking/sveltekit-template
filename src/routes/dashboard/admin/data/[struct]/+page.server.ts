import { DB } from '$lib/server/db/index.js';
import { Account } from '$lib/server/structs/account.js';
import { redirect, fail } from '@sveltejs/kit';
import { count, ilike } from 'drizzle-orm';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');

	if (!(await Account.isAdmin(event.locals.account).unwrap()))
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});

	const struct = Struct.structs.get(event.params.struct);
	if (!struct)
		throw fail(ServerCode.notFound, { message: `Struct not found: ${event.params.struct}` });

	const limit = Number(event.url.searchParams.get('limit') || '50');
	if (limit > 1000) {
		throw fail(ServerCode.badRequest, { message: 'Limit cannot exceed 1000' });
	}
	const offset = Number(event.url.searchParams.get('page') || '0') * limit;
	const search = event.url.searchParams.get('search');
	const column = event.url.searchParams.get('column');

	const data = await DB.select()
		.from(struct.table)
		.where(
			search && column && struct.table[column]
				? ilike(struct.table[column], `%${search}%`)
				: search
					? Object.values(struct.table).find((col) => col.columnType === 'string')
						? ilike(
								Object.values(struct.table).find((col) => col.columnType === 'string')!,
								`%${search}%`
							)
						: undefined
					: undefined
		)
		.orderBy(struct.table.created)
		.offset(offset)
		.limit(limit);

	const total = await DB.select({
		count: count()
	})
		.from(struct.table)
		.where(
			search && column && struct.table[column]
				? ilike(struct.table[column], `%${search}%`)
				: search
					? Object.values(struct.table).find((col) => col.columnType === 'string')
						? ilike(
								Object.values(struct.table).find((col) => col.columnType === 'string')!,
								`%${search}%`
							)
						: undefined
					: undefined
		);
	return {
		struct: struct.data.name,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data: data.map((d) => struct.Generator(d as any).safe()),
		total: total[0]?.count || 0,
		structType: Object.fromEntries(
			Object.entries(struct.table)
				.filter(([k]) => k !== 'enableRLS')
				.map(([key, value]) => [key, value.columnType.slice(2).toLowerCase()])
		),
		safes: struct.data.safes,
		limit,
		page: Math.floor(offset / limit)
	};
};
