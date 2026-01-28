/**
 * @fileoverview Server load for admin accounts list at `/dashboard/admin/account`.
 */
import { Account } from '$lib/server/structs/account.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { redirect, fail } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});
	}

	const page = parseInt(event.url.searchParams.get('page') || '0');
	const limit = parseInt(event.url.searchParams.get('limit') || '50');

	const accounts = await Account.Account.all({
		type: 'array',
		limit,
		offset: page * limit,
		includeArchived: true
	}).unwrap();

	return {
		accounts: await Promise.all(
			accounts.map(async (a) => {
				const roles = await Permissions.getRolesFromAccount(a).unwrap();
				return {
					account: a.safe(),
					roles: roles.map((r) => r.safe())
				};
			})
		),
		total: await Account.Account.all({ type: 'count' }).unwrap(),
		page,
		limit
	};
};
