import { Account } from '$lib/server/structs/account.js';
import { Logs } from '$lib/server/structs/log.js';
import { Struct } from 'drizzle-struct/back-end';

export const load = async (event) => {
	const limit = Math.abs(parseInt(event.url.searchParams.get('limit') || '10'));
	const page = Math.abs(parseInt(event.url.searchParams.get('page') || '1'));
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
