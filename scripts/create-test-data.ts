import { Test } from '../src/lib/server/structs/testing';
import { Struct } from 'drizzle-struct';
import { DB } from '../src/lib/server/db/index.js';

export default async (num: string) => {
	await Struct.buildAll(DB).unwrap();
	const data = parseInt(num);
	if (isNaN(data) || data <= 0) {
		throw new Error('Invalid number');
	}
	await Promise.all(
		Array.from({ length: data }, async (_, i) => {
			await Test.TestPermissions.new({
				name: `Test Permission ${i + 1}`,
				age: Math.floor(Math.random() * 100)
			}).unwrap();
		})
	);
};
