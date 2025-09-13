import { text } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import terminal from '../utils/terminal';
import { Permissions } from './permissions';
import { env } from '../utils/env';

terminal.log(
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

	export const TestPermissions = new Struct({
		name: 'test_permissions',
		structure: {
			name: text('name').notNull(),
			age: integer('age').notNull()
		}
	});

	if (env !== 'prod') {
		Permissions.createEntitlement({
			name: 'test-permission-view',
			description: 'Permission to view test entries',
			structs: [TestPermissions],
			permissions: ['test_permissions:read:*'],
			features: [],
			group: 'Testing'
		});

		Permissions.createEntitlement({
			name: 'test-permission-manage',
			description: 'Permission to manage test entries',
			structs: [TestPermissions],
			permissions: ['test_permissions:*:*'],
			features: [],
			group: 'Testing'
		});
	}
}

export const _test = Test.Test.table;
export const _testVersion = Test.Test.versionTable;
export const _testPermissions = Test.TestPermissions.table;
