import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db';
import { Limiting } from '../src/lib/server/structs/limiting';

export default async () => {
	await Struct.buildAll(DB).unwrap();

	const data = await Limiting.PageRuleset.all({ type: 'all' }).unwrap();
	console.log(data);
};
