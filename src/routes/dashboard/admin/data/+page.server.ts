import { fail, redirect } from '@sveltejs/kit';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';
import { Account } from '$lib/server/structs/account';

export const load = async (event) => {
	if (!event.locals.account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}
	if (!(await Account.isAdmin(event.locals.account).unwrap()))
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});

	const struct = Array.from(Struct.structs.values())[0]?.name;
	if (!struct) throw fail(ServerCode.notFound, { message: 'No structs found' });
	throw redirect(ServerCode.permanentRedirect, `/dashboard/admin/data/${struct}`);
};
