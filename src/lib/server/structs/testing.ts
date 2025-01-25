import { text } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';

console.log(
	`This file ('./struct/testing') should only be used for unit tests. If you are seeing this outside of a unit testing environment, there is an issue with the program.`
);

export namespace Test {
	export const Test = new Struct({
		name: 'test',
		structure: {
			name: text('name').notNull(),
			age: integer('age').notNull()
		},
		versionHistory: {
			amount: 2,
			type: 'versions'
		},
		lifetime: 1000 * 60 * 10
	});

	export const API = new Struct({
		name: 'api_test',
		structure: {
			name: text('name').notNull(),
			age: integer('age').notNull()
		},
		lifetime: 1000 * 60 * 10,
		frontend: false,
		reflection: true,
		log: true,
	});
}

export const _test = Test.Test.table;
export const _testVersion = Test.Test.versionTable;
export const _API = Test.API.table;