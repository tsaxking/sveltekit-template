import { Test } from '$lib/server/structs/testing.js';
import { fail } from '@sveltejs/kit';

export const load = async () => {
	const data = await Test.Test.all({
		type: 'all'
	});

	if (data.isErr()) {
		throw fail(500);
	}

	return {
		data: data.value.map((d) => d.safe())
	};
};
