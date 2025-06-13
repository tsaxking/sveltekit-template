/* eslint-disable @typescript-eslint/no-explicit-any */
import { text } from 'drizzle-orm/pg-core';
import {
	DataError,
	DataVersion,
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
// import { EntitlementPermission, createEntitlement } from '../utils/entitlements';
import type { Entitlement } from '$lib/types/entitlements';
import { z } from 'zod';
import { Session } from './session';
import terminal from '../utils/terminal';
import path from 'path';
import fs from 'fs';

export namespace Permissions {
	const block = <T extends Blank>(struct: Struct<T, string>) => {
		struct.block(DataAction.Delete, () => true, `Cannot delete ${struct.name}`);
		struct.block(DataAction.Create, () => true, `Cannot create new ${struct.name}`);
		struct.block(PropertyAction.Update, () => true, `Cannot update ${struct.name}`);	
		struct.block(DataAction.Archive, () => true, `Cannot archive ${struct.name}`);
		struct.block(DataAction.RestoreArchive, () => true, `Cannot restore ${struct.name}`);
		struct.block(DataAction.DeleteVersion, () => true, `Cannot delete version of ${struct.name}`);
		struct.block(DataAction.RestoreVersion, () => true, `Cannot create version of ${struct.name}`);
	}

	export const Role = new Struct({
		name: 'role',
		structure: {
			name: text('name').notNull(),
			description: text('description').notNull()
		},
	});

	block(Role);

	export type RoleData = typeof Role.sample;

	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			role: text('role').notNull(),
			account: text('account').notNull()
		},
	});

	block(RoleAccount);

	export type RoleAccountData = typeof RoleAccount.sample;

	export const Entitlement = new Struct({
		name: 'entitlements',
		structure: {
			name: text('name').notNull().unique(),
			description: text('description').notNull().default(''),
			structs: text('structs').notNull().default('[]'), // JSON string of struct names
			permissions: text('permissions').notNull().default('[]'), // JSON string of permissions
			group: text('group').notNull() // Group name for UI organization
		},
	});

	Entitlement.bypass(PropertyAction.Read, () => true); // Allow reading entitlements without permission checks

	block(Entitlement);

	export type EntitlementData = typeof Entitlement.sample;

	export const RoleRuleset = new Struct({
		name: 'role_rulesets',
		structure: {
			role: text('role').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull()
		},
	});

	block(RoleRuleset);

	export type RoleRulesetData = typeof RoleRuleset.sample;

	export const AccountRuleset = new Struct({
		name: 'account_rulesets',
		structure: {
			account: text('account').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull()
		},
	});

	block(AccountRuleset);

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
		data: StructData<T, string>[] | DataVersion<T, string>[],
		action: PropertyAction
	) => {
		return attemptAsync<Partial<Structable<T>>[]>(async () => {
			if (data.length === 0) {
				return [];
			}
			const struct = data[0]?.struct;
			if (!struct) {
				throw new Error('No struct found in data');
			}
			if (!data.every((d) => d.struct.name === struct.name)) {
				throw new Error('All data must be of the same struct type');
			}
			if (await Account.isAdmin(account).unwrap()) {
				return data.map((d) => d.data) as Partial<Structable<T>>[];
			}
			const rulesets = await getRulesetsFromAccount(account).unwrap();
			const entitlements = await Entitlement.all({ type: 'all' }).unwrap();
			const permissions = entitlements.map((e) => getPermissionsFromEntitlement(e).unwrap());

			const entitlementsByName = Object.fromEntries(entitlements.map((e) => [e.data.name, e]));
			const permissionsByName = Object.fromEntries(permissions.map((p) => [p.name, p]));

			const res = rulesets.map((r) => ({
				ruleset: r,
				entitlement: entitlementsByName[r.data.entitlement],
				permissions: permissionsByName[r.data.entitlement]
			}));

			return data.map((d) => {
				if (struct.bypasses.some((b) => b.action === action && b.condition(account, d.data))) {
					return d.data;
				}

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

	// TODO: Bypasses
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

	const ENTITLEMENT_FILE = path.join(process.cwd(), 'src', 'lib', 'types', 'entitlements.ts');

	export const getEntitlements = async () => {
		return Permissions.Entitlement.all({ type: 'all' });
	};

	export class CombinedEntitlementPermission {
		public readonly permissions: { action: string; property: string }[];
		constructor(
			public readonly name: Entitlement,
			public readonly struct: string,
			entitlements: EntitlementPermission[],
			public readonly pages: string[]
		) {
			this.permissions = entitlements.flatMap((e) => {
				if (e.permissions.length === 0 || e.permissions.some((p) => p.struct === '*')) {
					return [{ action: '*', property: '*' }];
				}
				return e.permissions
					.filter((p) => p.struct === this.struct || p.struct === '*')
					.map((p) => ({ action: p.action, property: p.property }));
			});
		}
	}

	export class EntitlementPermission {
		public readonly permissions: { struct: string; action: string; property: string }[];
		constructor(
			public readonly name: Entitlement,
			public readonly structs: string[],
			permissions: string[],
			public readonly pages: string[],
			public readonly group: string
		) {
			this.permissions = permissions.map((p) => {
				if (p === '*') return { action: '*', property: '*', struct: '*' };
				const [struct, action, property] = p.split(':');
				return { struct, action, property };
			});
		}

		_saved = Date.now();

		test<T extends Blank>(
			data: StructData<T, string> | DataVersion<T, string>,
			action: PropertyAction | DataAction,
			property?: keyof T
		) {
			return attempt(() => {
				if (this.structs.length > 0 && !this.structs.includes(data.struct.name)) {
					return false;
				}
				if (this.permissions.length === 0 || this.permissions.some((p) => p.struct === '*')) {
					return true;
				}
				return this.permissions.some(
					(p) =>
						(p.struct === data.struct.name || p.struct === '*') &&
						(p.action === action || p.action === '*') &&
						(p.property === '*' ||
							(p.property == property &&
								Object.keys(data.struct.data.structure).includes(p.property)))
				);
			});
		}

		canCreate<T extends Blank>(data: Struct<T, string>) {
			return attempt(() => {
				if (this.structs.length > 0 && !this.structs.includes(data.data.name)) {
					return false;
				}
				if (this.permissions.length === 0 || this.permissions.some((p) => p.struct === '*')) {
					return true;
				}
				return this.permissions.some(
					(p) =>
						(p.struct === data.data.name || p.struct === '*') &&
						(p.action === DataAction.Create || p.action === '*')
				);
			});
		}
	}

	const saveEntitlements = async () => {
		const entitlements = await getEntitlements();
		if (entitlements.isErr()) {
			return terminal.error(entitlements);
		}
		return fs.promises.writeFile(
			ENTITLEMENT_FILE,
			`
	export type Entitlement = \n    ${entitlements.value.map((e) => `'${e.data.name}'`).join('\n  | ')};
	export type Group = \n    ${Array.from(new Set(entitlements.value.map((e) => `'${e.data.group}'`))).join('\n  | ')};
			`.trim()
		);
	};

	export type Permission<S extends Struct<Blank, string>[]> =
		| `${Extract<S[number]['data']['name'], string>}:${PropertyAction | '*'}:${
				| Extract<keyof UnionToIntersection<S[number]['data']['structure']>, string>
				| '*'}`
		| `${Extract<S[number]['data']['name'], string>}:${DataAction}`
		| '*';

	type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
		k: infer I
	) => void
		? I
		: never;

	let timeout: NodeJS.Timeout | undefined;

	let toBuilds: (() => {})[] | undefined = [];
	const onceBuild = async () => {
		if (toBuilds === undefined) return; // Already built
		await Promise.all(toBuilds.map((f) => f()));
		toBuilds = undefined;
	};

	// This is not wrapped in an attemptAsync because if it fails, this is a critical error that should not be ignored.
	export const createEntitlement = async <S extends Struct[]>(entitlement: {
		name: string;
		group: string;
		description: string;
		structs: S;
		permissions: Permission<S>[]; // Now supports multiple structs
	}) => {
		if (!/[a-z0-9-]+/.test(entitlement.name)) {
			throw new Error(
				`Entitlement name must be lowercase and contain only letters, numbers, and hyphens. (${entitlement.name})`
			);
		}

		const run = async () => {
			const e = await Permissions.Entitlement.fromProperty('name', entitlement.name, {
				type: 'single'
			}).unwrap();

			if (e) {
				await e.delete().unwrap();
			}
			await Permissions.Entitlement.new(
				{
					name: entitlement.name,
					group: entitlement.group,
					structs: JSON.stringify(entitlement.structs.map((s) => s.data.name)),
					permissions: JSON.stringify(entitlement.permissions),
					description: entitlement.description
				},
				{
					static: true
				}
			).unwrap();

			if (timeout) clearTimeout(timeout);
			setTimeout(async () => {
				saveEntitlements();
			});
		};

		if (Permissions.Entitlement.built) {
			await run();
		} else {
			toBuilds?.push(run);
		}
	};

	Permissions.Entitlement.once('build', onceBuild);

	createEntitlement({
		name: 'manage-roles',
		structs: [Role],
		permissions: ['*'],
		group: 'Roles',
		description: 'Allows managing roles, including creating, updating, and deleting roles.'
	});

	createEntitlement({
		name: 'view-roles',
		structs: [Role],
		permissions: ['role:read:name', 'role:read:description'],
		group: 'Roles',
		description: 'Allows viewing roles and their details.'
	});
}

// for drizzle
export const _role = Permissions.Role.table;
export const _roleAccount = Permissions.RoleAccount.table;
export const _entitlement = Permissions.Entitlement.table;
export const _roleRuleset = Permissions.RoleRuleset.table;
export const _accountRuleset = Permissions.AccountRuleset.table;
