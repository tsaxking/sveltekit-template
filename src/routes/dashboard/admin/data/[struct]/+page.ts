import { Struct } from 'drizzle-struct/front-end';

export const load = async (event) => {
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) throw new Error('No structs found');

	return {
		...event.data,
		struct,
		data: struct.arr(event.data.data.map((d) => struct.Generator(d)))
	};
};
