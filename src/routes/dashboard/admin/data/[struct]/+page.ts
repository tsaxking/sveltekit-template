import { Struct } from '$lib/services/struct';
import '$lib/model/account';
import '$lib/model/analytics';
import '$lib/model/permissions';
import '$lib/model/testing.svelte.js';

export const load = (event) => {
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) throw new Error('Struct not found');

	const arr = struct.arr(
		event.data.data.map((d) => struct.Generator(d)),
		() => true
	);

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
