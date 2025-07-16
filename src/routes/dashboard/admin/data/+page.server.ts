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
};
