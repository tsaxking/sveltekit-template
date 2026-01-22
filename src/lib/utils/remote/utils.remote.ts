import { getRequestEvent, query } from '$app/server';
import { Account } from '../../server/structs/account';

export const isAdmin = query(() => {
	const a = getRequestEvent().locals.account;
	if (!a) return false;
	return Account.isAdmin(a).unwrap();
});
