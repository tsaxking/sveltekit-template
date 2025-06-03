import { text } from 'drizzle-orm/pg-core';
import {
	DataError,
	Struct,
	StructData,
	StructStream,
	type Blank,
	type Structable
} from 'drizzle-struct/back-end';
import { attempt, attemptAsync, resolveAll, type Result } from 'ts-utils/check';
import { Account } from './account';
import { PropertyAction, DataAction } from 'drizzle-struct/types';
import { Stream } from 'ts-utils/stream';
import { DB } from '../db';
import { and, eq } from 'drizzle-orm';
import {
	readEntitlement,
	type EntitlementPermission,
	createEntitlement
} from '../utils/entitlements';
import type { Entitlement } from '$lib/types/entitlements';
import { z } from 'zod';
import { Session } from './session';
import terminal from '../utils/terminal';

export namespace Permissions {
	export const Role = new Struct({
		name: 'role',
		structure: {
			name: text('name').notNull(),
			description: text('description').notNull(),
			// links: text('links').notNull(),
		},
		generators: {
			// links: () => JSON.stringify([]),
		}
	});

	export type RoleData = typeof Role.sample;

	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			role: text('role').notNull(),
			account: text('account').notNull()
		},
		frontend: false
	});

	export type RoleAccountData = typeof RoleAccount.sample;

	export const Entitlement = new Struct({
		name: 'entitlements',
		structure: {
			name: text('name').notNull().unique(),
			structs: text('structs').notNull(), // JSON string of struct names
			permissions: text('permissions').notNull(), // JSON string of permissions
			group: text('group').notNull(), // Group name for UI organization
		}
	});

	export type EntitlementData = typeof Entitlement.sample;

	export const Ruleset = new Struct({
		name: 'rulesets',
		structure: {
			role: text('role').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull(),
		}
	});

	export type RulesetData = typeof Ruleset.sample;

	export const getRolesFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Role.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Role.table.id))
				.where(eq(RoleAccount.table.account, account.id));

			return res.map(r => Role.Generator(r.role));
		});
	};

	export const getEntitlementsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Entitlement.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Entitlement.table.id))
				.where(eq(RoleAccount.table.role, role.id));
			return res.map(r => Entitlement.Generator(r.entitlements));
		});
	}

	export const getEntitlementsFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Entitlement.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Entitlement.table.id))
				.where(eq(RoleAccount.table.account, account.id));
			return res.map(r => Entitlement.Generator(r.entitlements));
		});
	};

	export const getRulesetsFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Ruleset.table)
				.innerJoin(Role.table, eq(Ruleset.table.role, Role.table.id))
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Role.table.id))
				.where(eq(RoleAccount.table.account, account.id));
			return res.map(r => Ruleset.Generator(r.rulesets));
		});
	};

	export const getRulesetsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Ruleset.table)
				.where(eq(Ruleset.table.role, role.id));
			return res.map(r => Ruleset.Generator(r));
		});
	};



	export const canDo = (
		account: Account.AccountData,
		data: StructData<Blank, string>[],
		action: DataAction,
	) => {
		return attemptAsync(async () => {});
	}

	export const filterPropertyAction = (
		account: Account.AccountData,
		data: StructData<Blank, string>[],
		action: PropertyAction,
	) => {
		return attemptAsync(async () => {});
	}

	createEntitlement({
		name: 'manage-roles',
		structs: [Role],
		permissions: ['*'],
		pages: ['roles'],
		group: 'Roles'
	});

	createEntitlement({
		name: 'view-roles',
		structs: [Role],
		permissions: ['role:read:name', 'role:read:description'],
		group: 'Roles'
	});
}

// for drizzle
export const _roleTable = Permissions.Role.table;
export const _roleAccountTable = Permissions.RoleAccount.table;
