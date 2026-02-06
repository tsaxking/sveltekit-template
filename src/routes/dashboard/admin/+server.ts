/**
 * @fileoverview Admin API endpoint for `/dashboard/admin`.
 */
import { Account } from '$lib/server/structs/account.js';
import { redirect, fail } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const GET = async (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');

	if (!(await Account.isAdmin(event.locals.account).unwrap()))
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});

	throw redirect(ServerCode.permanentRedirect, '/dashboard/admin/logs');
};
