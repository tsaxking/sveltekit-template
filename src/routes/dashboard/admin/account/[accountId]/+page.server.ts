import { Account } from '$lib/server/structs/account.js';
import { Session } from '$lib/server/structs/session.js';
import { redirect, fail } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});
	}

	const account = await Account.Account.fromId(event.params.accountId).unwrap();
	if (!account) {
		throw fail(ServerCode.notFound, {
			message: 'Account not found'
		});
	}

	const limit = Number(event.url.searchParams.get('limit') || '50');
	const offset = Number(event.url.searchParams.get('page') || '0') * limit;

	const sessions = await Session.Session.fromProperty('accountId', event.params.accountId, {
		type: 'array',
		limit,
		offset
	}).unwrap();

	const total = await Session.Session.fromProperty('accountId', event.params.accountId, {
		type: 'count'
	}).unwrap();

	return {
		sessions: sessions.map((s) => s.safe()),
		account: account.safe(),
		page: offset / limit,
		limit,
		total
	};
};
