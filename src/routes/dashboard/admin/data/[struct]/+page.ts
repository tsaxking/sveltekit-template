import { Struct } from '$lib/services/struct';
import '$lib/model/account';
import '$lib/model/analytics';
import '$lib/model/permissions';

export const load = (event) => {
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) throw new Error('Struct not found');

	const arr = struct.arr(event.data.data.map((d) => struct.Generator(d)));

	struct.on('archive', () => arr.inform());
	struct.on('update', () => arr.inform());
	struct.on('new', () => arr.inform());
	struct.on('delete', () => arr.inform());
	struct.on('restore', () => arr.inform());

	return {
		struct,
		data: arr,
		total: event.data.total,
		structType: event.data.structType,
		safes: event.data.safes,
		limit: event.data.limit,
		page: event.data.page
	};
};
