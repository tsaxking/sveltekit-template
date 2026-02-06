/**
 * @fileoverview Server load for admin roles list `/dashboard/admin/role`.
 */
import { Account } from '$lib/server/structs/account.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { fail, redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	if (!event.locals.account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}

	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});
	}

	const page = parseInt(event.url.searchParams.get('page') || '0');
	const limit = parseInt(event.url.searchParams.get('limit') || '50');

	const roles = await Permissions.Role.all({
		type: 'array',
		offset: page * limit,
		limit
	}).unwrap();

	return {
		roles: await Promise.all(
			roles.map(async (r) => {
				return {
					role: r.safe(),
					parent: (await Permissions.Role.fromId(r.data.parent).unwrapOr(undefined))?.safe()
				};
			})
		)
	};
};
