/**
 * @fileoverview Server load for admin logs `/dashboard/admin/logs`.
 */
import { Account } from '$lib/server/structs/account.js';
import { Logs } from '$lib/server/structs/log.js';
import { Struct } from 'drizzle-struct';
import { fail, redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}
	if (!(await Account.isAdmin(event.locals.account)).unwrap())
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});
	const limit = Math.abs(parseInt(event.url.searchParams.get('limit') || '100'));
	let page = Math.abs(parseInt(event.url.searchParams.get('page') || '1'));
	if (page === 0) page = 1;
	const accountId = event.url.searchParams.get('account');
	const type = event.url.searchParams.get('type');
	const dataId = event.url.searchParams.get('data');
	const message = event.url.searchParams.get('message');
	const struct = event.url.searchParams.get('struct');
	const offset = (page - 1) * limit;

	const logs = (
		await Logs.search({
			accountId,
			type,
			dataId,
			message,
			struct,
			offset,
			limit
		})
	).unwrap();

	const total = (
		await Logs.Log.all({
			type: 'count'
		})
	).unwrap();

	return {
		logs: await Promise.all(
			logs.logs.map(async (l) => {
				const log = l.safe();
				const account = (await Account.Account.fromId(log.accountId)).unwrap();
				const res = await Struct.structs.get(log.struct)?.fromId(log.dataId);
				return {
					...log,
					account: account?.safe(),
					data: res?.unwrap()?.safe()
				};
			})
		),
		count: logs.count,
		structs: Array.from(Struct.structs.values().map((s) => s.name)),

		accountId,
		type,
		dataId,
		message,
		struct,
		page,
		limit,
		total
	};
};
