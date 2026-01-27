import { Struct } from 'drizzle-struct';
import { openStructs } from '../cli/struct';
import { DB } from '../src/lib/server/db';

export default async () => {
	await openStructs().unwrap();
	await Struct.buildAll(DB).unwrap();

	let affected = 0;

	await Promise.all(
		Array.from(Struct.structs).map(async ([, struct]) => {
			const all = await struct.all({ type: 'all' }).unwrap();
			affected += all.length;
			return Promise.all(
				all.map(async (item) => {
					return item.resetHash().unwrap();
				})
			);
		})
	);

	console.log(`Generated hashes for ${affected} items.`);
};
