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
import { EntitlementPermission, readEntitlement, createEntitlement } from '../utils/entitlements';
import type { Entitlement } from '$lib/types/entitlements';
import { z } from 'zod';
import { Session } from './session';
import terminal from '../utils/terminal';

export namespace Permissions {
	export const Role = new Struct({
		name: 'role',
		structure: {
			name: text('name').notNull(),
			description: text('description').notNull()
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
			structs: text('structs').notNull().default('[]'), // JSON string of struct names
			permissions: text('permissions').notNull().default('[]'), // JSON string of permissions
			group: text('group').notNull() // Group name for UI organization
		}
	});

	export type EntitlementData = typeof Entitlement.sample;

	export const RoleRuleset = new Struct({
		name: 'role_rulesets',
		structure: {
			role: text('role').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull()
		}
	});

	export type RoleRulesetData = typeof RoleRuleset.sample;

	export const AccountRuleset = new Struct({
		name: 'account_rulesets',
		structure: {
			account: text('account').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull()
		}
	});

	export type AccountRulesetData = typeof AccountRuleset.sample;

	export const getRolesFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Role.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Role.table.id))
				.where(eq(RoleAccount.table.account, account.id));

			return res.map((r) => Role.Generator(r.role));
		});
	};

	export const getEntitlementsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Entitlement.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Entitlement.table.id))
				.where(eq(RoleAccount.table.role, role.id));
			return res.map((r) => Entitlement.Generator(r.entitlements));
		});
	};

	export const getEntitlementsFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Entitlement.table)
				// TODO: fix this query with proper joins
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Entitlement.table.id))
				.where(eq(RoleAccount.table.account, account.id));
			return res.map((r) => Entitlement.Generator(r.entitlements));
		});
	};

	export const getRulesetsFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const byRole = await DB.select()
				.from(RoleRuleset.table)
				.innerJoin(Role.table, eq(RoleRuleset.table.role, Role.table.id))
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Role.table.id))
				.where(eq(RoleAccount.table.account, account.id));
			const byAccount = await DB.select()
				.from(AccountRuleset.table)
				.where(eq(AccountRuleset.table.account, account.id));
			return [
				...byRole.map((r) => RoleRuleset.Generator(r.role_rulesets)),
				...byAccount.map((r) => AccountRuleset.Generator(r))
			];
		});
	};

	export const getRulesetsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(RoleRuleset.table)
				.where(eq(RoleRuleset.table.role, role.id));
			return res.map((r) => RoleRuleset.Generator(r));
		});
	};

	export const getPermissionsFromEntitlement = (entitlement: EntitlementData) => {
		return attempt(() => {
			return new EntitlementPermission(
				entitlement.data.name as Entitlement,
				z.array(z.string()).parse(JSON.parse(entitlement.data.structs)),
				z.array(z.string()).parse(JSON.parse(entitlement.data.permissions)),
				[],
				entitlement.data.group
			);
		});
	};

	export const canCreate = <T extends Blank>(
		account: Account.AccountData,
		struct: Struct<T, string>,
		attributes: string[]
	) => {
		return attemptAsync(async () => {
			if (await Account.isAdmin(account).unwrap()) return true;
			const rulesets = await getRulesetsFromAccount(account).unwrap();
			if (rulesets.length === 0) return false;

			const entitlements = await Entitlement.all({ type: 'all' }).unwrap();
			const permissions = entitlements.map((e) => getPermissionsFromEntitlement(e).unwrap());

			// const entitlementsByName = Object.fromEntries(entitlements.map(e => [e.data.name, e]));
			const permissionsByName = Object.fromEntries(permissions.map((p) => [p.name, p]));

			// Check that every attribute is allowed by some matching ruleset+permission
			for (const attr of attributes) {
				const isPermitted = rulesets.some((ruleset) => {
					if (ruleset.data.target !== attr) return false;

					const permission = permissionsByName[ruleset.data.entitlement];
					if (!permission) return false;

					return permission.canCreate(struct);
				});

				if (!isPermitted) return false; // One attribute isn't allowed → fail early
			}

			return true;
		});
	};

	export const canDo = <T extends Blank>(
		entitlement: EntitlementData,
		targetAttribute: string,
		data: StructData<T, string>,
		action: DataAction | PropertyAction
	) => {
		return attempt(() => {
			const permissions = getPermissionsFromEntitlement(entitlement).unwrap();
			const attributes = data.getAttributes().unwrap();
			if (!attributes.includes(targetAttribute)) {
				return false;
			}

			return permissions.test(data, action).unwrap();
		});
	};

	export const accountCanDo = (
		account: Account.AccountData,
		data: StructData<Blank, string>[],
		action: DataAction | PropertyAction
	) => {
		return attemptAsync(async () => {
			if (await Account.isAdmin(account).unwrap()) return data.map(() => true);
			const [rulesets, entitlements] = await Promise.all([
				getRulesetsFromAccount(account).unwrap(),
				Entitlement.all({
					type: 'all'
				}).unwrap()
			]);
			const res = rulesets.map((r) => ({
				ruleset: r,
				entitlement: entitlements.find((e) => e.data.name === r.data.entitlement)
			}));
			return data.map((d) =>
				res.some((r) => {
					if (!r.entitlement) return false;
					return canDo(r.entitlement, r.ruleset.data.target, d, action).unwrap();
				})
			);
		});
	};

	export const rolesCanDo = <T extends Blank>(
		roles: RoleData[],
		data: StructData<T, string>[],
		action: DataAction | PropertyAction
	) => {
		return attemptAsync(async () => {
			const rulesets = resolveAll(await Promise.all(roles.map((r) => getRulesetsFromRole(r))))
				.unwrap()
				.flat();
			const entitlements = await Entitlement.all({ type: 'all' }).unwrap();

			const res = rulesets.map((r) => ({
				ruleset: r,
				entitlement: entitlements.find((e) => e.data.name === r.data.entitlement)
			}));
			return data.map((d) =>
				res.some((r) => {
					if (!r.entitlement) return false;
					return canDo(r.entitlement, r.ruleset.data.target, d, action).unwrap();
				})
			);
		});
	};

	export const filterPropertyActionFromAccount = <T extends Blank>(
		account: Account.AccountData,
		data: StructData<T, string>[],
		action: PropertyAction
	) => {
		return attemptAsync<Partial<Structable<T>>[]>(async () => {
			if (await Account.isAdmin(account).unwrap()) {
				return data.map((d) => d.data) as Partial<Structable<T>>[];
			}
			const blank = () => [] as Partial<Structable<T>>[];
			const roles = await getRolesFromAccount(account).unwrap();
			if (roles.length === 0) return blank();
			const rulesets = await getRulesetsFromAccount(account).unwrap();
			if (rulesets.length === 0) return blank();
			const entitlements = await Entitlement.all({ type: 'all' }).unwrap();
			if (entitlements.length === 0) return blank();
			const permissions = entitlements.map((e) => getPermissionsFromEntitlement(e).unwrap());

			const entitlementsByName = Object.fromEntries(entitlements.map((e) => [e.data.name, e]));
			const permissionsByName = Object.fromEntries(permissions.map((p) => [p.name, p]));

			const res = rulesets.map((r) => ({
				ruleset: r,
				entitlement: entitlementsByName[r.data.entitlement],
				permissions: permissionsByName[r.data.entitlement]
			}));

			return data.map((d) => {
				const attributes = d.getAttributes().unwrap();
				// all rulsets that match the action, struct, and target attribute
				const rulesets = res.filter((r) => {
					if (!r.entitlement) return false;
					if (!r.permissions) return false;
					if (
						!r.permissions.permissions.find(
							(p) => p.action === action && (p.struct === d.struct.name || p.struct === '*')
						)
					) {
						return false; // no permissions for this action and struct combination
					}

					return attributes.includes(r.ruleset.data.target);
				});

				const keys = Object.keys(d.data);

				return Object.fromEntries(
					keys
						.map((key) => {
							if (rulesets.some((r) => r.permissions?.test(d, action, key).unwrap())) {
								return [key, d.data[key]];
							}
							return false;
						})
						.filter(Boolean)
				) as Partial<Structable<T>>;
			});
		});
	};

	export const filterPropertyActionPipe = <T extends Blank, Name extends string>(
		account: Account.AccountData,
		action: PropertyAction,
		callback: (data: Partial<Structable<T>>) => void
	) => {
		const res = new Promise<
			| 'admin'
			| {
					permissions: EntitlementPermission;
					ruleset: RoleRulesetData | AccountRulesetData;
					entitlement: EntitlementData;
			  }[]
		>((resolve, reject) => {
			const result = attemptAsync(async () => {
				if (await Account.isAdmin(account).unwrap()) {
					return 'admin';
				}
				const blank = () =>
					[] as {
						permissions: EntitlementPermission;
						ruleset: RoleRulesetData | AccountRulesetData;
						entitlement: EntitlementData;
					}[];

				const roles = await getRolesFromAccount(account).unwrap();
				if (roles.length === 0) return blank();

				const rulesets = await getRulesetsFromAccount(account).unwrap();
				if (rulesets.length === 0) return blank();

				const entitlements = await Entitlement.all({ type: 'all' }).unwrap();
				if (entitlements.length === 0) return blank();

				const permissions = entitlements.map((e) => getPermissionsFromEntitlement(e).unwrap());

				const entitlementsByName = Object.fromEntries(entitlements.map((e) => [e.data.name, e]));
				const permissionsByName = Object.fromEntries(permissions.map((p) => [p.name, p]));

				return rulesets.map((r) => ({
					ruleset: r,
					entitlement: entitlementsByName[r.data.entitlement],
					permissions: permissionsByName[r.data.entitlement]
				}));
			});

			result.then((r) => {
				if (r.isErr()) {
					terminal.error('Error filtering property action', r.error);
					reject(r.error);
				} else {
					resolve(r.value);
				}
			});
		});

		return async (data: StructData<T>) => {
			const allRulesets = await res;

			if (allRulesets === 'admin') {
				// If admin, return all data
				callback(data.data as Partial<Structable<T>>);
				return;
			}

			const attributes = data.getAttributes().unwrap();
			const structName = data.struct.name;
			const keys = Object.keys(data.data);

			// Filter applicable rulesets for this data instance
			const matching = allRulesets.filter((r) => {
				if (!r.entitlement || !r.permissions) return false;
				if (
					!r.permissions.permissions.find(
						(p) => p.action === action && (p.struct === structName || p.struct === '*')
					)
				) {
					return false;
				}
				return attributes.includes(r.ruleset.data.target);
			});

			// Build filtered object
			const filtered = Object.fromEntries(
				keys
					.map((key) => {
						const allowed = matching.some((r) => r.permissions.test(data, action, key).unwrap());
						return allowed ? [key, data.data[key]] : false;
					})
					.filter(Boolean)
			) as Partial<Structable<T>>;

			callback(filtered);
		};
	};

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
