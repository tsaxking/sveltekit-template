import { fail } from '@sveltejs/kit';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	const limit = Math.abs(parseInt(event.url.searchParams.get('limit') || '100'));
	let page = Math.abs(parseInt(event.url.searchParams.get('page') || '1'));
	if (page === 0) page = 1;
	const offset = (page - 1) * limit;
	const structs = Array.from(Struct.structs.values());

	const struct = Struct.structs.get(event.params.struct);
	if (!struct) {
		throw fail(ServerCode.notFound, { message: 'No structs found' });
	}

	const data =
		(
			await struct.all({
				type: 'array',
				limit,
				offset
			})
		).unwrap() || [];

	return {
		structs: structs.map((s) => s.name),
		data: data.map((d) => d.safe()),
		struct: Object.fromEntries(Object.entries(struct.table).map(([k, v]) => [k, v.dataType]))
	};
};
