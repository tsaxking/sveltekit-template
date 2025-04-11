import { fail, redirect } from '@sveltejs/kit';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';

export const load = () => {
	const struct = Array.from(Struct.structs.values())[0]?.name;
	if (!struct) throw fail(ServerCode.notFound, { message: 'No structs found' });
	throw redirect(ServerCode.permanentRedirect, `/dashboard/admin/data/${struct}`);
};
