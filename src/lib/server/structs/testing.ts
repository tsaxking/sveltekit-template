/**
 * @fileoverview Test-only structs and entitlements for non-production runs.
 *
 * These structs are meant for unit testing and should not be used in
 * production environments.
 *
 * @example
 * import { Test } from '$lib/server/structs/testing';
 * const entry = await Test.Test.new({ name: 'Test', age: 42 }).unwrap();
 */
import { text } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import terminal from '../utils/terminal';
import { Permissions } from './permissions';
import { env } from '../utils/env';
import structRegistry from '../services/struct-registry';

terminal.log(
	`This file ('./struct/testing') should only be used for unit tests. If you are seeing this outside of a unit testing environment, there is an issue with the program.`
);

export namespace Test {
	/**
	 * Test struct with version history and lifetime.
	 *
	 * @property {string} name - Name field.
	 * @property {number} age - Age field.
	 */
	export const Test = new Struct({
		name: 'test',
		structure: {
			/** Name field. */
			name: text('name').notNull(),
			/** Age field. */
			age: integer('age').notNull()
		},
		versionHistory: {
			amount: 2,
			type: 'versions'
		},
		lifetime: 1000 * 60 * 10
	});

	structRegistry.register(Test);

	/**
	 * Permissions test struct.
	 *
	 * @property {string} name - Name field.
	 * @property {number} age - Age field.
	 */
	export const TestPermissions = new Struct({
		name: 'test_permissions',
		structure: {
			/** Name field. */
			name: text('name').notNull(),
			/** Age field. */
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

	structRegistry.register(TestPermissions);
}

export const _test = Test.Test.table;
export const _testVersion = Test.Test.versionTable;
export const _testPermissions = Test.TestPermissions.table;
