import { Account } from '$lib/server/structs/account.js';
import { redirect, fail } from '@sveltejs/kit';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');

	if (!(await Account.isAdmin(event.locals.account).unwrap()))
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});

	const struct = Struct.structs.get(event.params.struct);
	if (!struct) throw fail(ServerCode.notFound, { message: 'Struct not found' });

	const limit = Number(event.url.searchParams.get('limit') || '50');
	const offset = Number(event.url.searchParams.get('page') || '0') * limit;

	const data = await struct
		.all({
			type: 'array',
			limit,
			offset,
			includeArchived: true
		})
		.unwrap();

	return {
		struct: struct.data.name,
		data: data.map((d) => d.safe()),
		total: await struct.all({ type: 'count' }).unwrap(),
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
