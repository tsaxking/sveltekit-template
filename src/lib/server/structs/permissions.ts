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
import { Universes } from './universe';
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
			// universe: text('universe').notNull(),
			description: text('description').notNull(),
			links: text('links').notNull(),
			entitlements: text('entitlements').notNull().default('[]')
		},
		generators: {
			links: () => JSON.stringify([]),
			entitlements: () => JSON.stringify([])
		}
	});

	Role.block(PropertyAction.Update, () => true, 'Not allowed to update Roles through the API.');

	Role.callListen('update-entitlements', async (event, data) => {
		const session = (await Session.getSession(event)).unwrap();
		const account = (await Session.getAccount(session)).unwrap();

		if (!account) {
			console.error('No Account');
			return {
				success: false,
				reason: 'Not logged in'
			};
		}

		const body = z
			.object({
				role: z.string(),
				permissions: z.array(z.string())
			})
			.parse(data);

		const role = (await Role.fromId(body.role)).unwrap();

		if (!role) {
			console.error('No Role');
			return {
				success: false,
				reason: 'Role not found'
			};
		}

		const universe = (await Universes.Universe.fromId(role.data.universe)).unwrap();
		if (!universe) {
			console.error('No Universe');
			return {
				success: false,
				reason: 'Universe not found'
			};
		}

		const roles = (await getUniverseAccountRoles(account, universe)).unwrap();
		if (!(await isEntitled(roles, 'manage-roles')).unwrap()) {
			console.error('No Entitlement');
			return {
				success: false,
				reason: 'Not entitled'
			};
		}

		const entitlements = (await entitlementsFromRoles(roles)).unwrap().map((e) => e.name);
		// a user can only give permissions they have
		const permissions = body.permissions.filter((p) => entitlements.includes(p as Entitlement));
		if (permissions.length !== body.permissions.length) {
			console.error('Invalid Permissions');
			return {
				success: false,
				reason: 'Invalid Permissions, cannot give permissions you do not have'
			};
		}

		(
			await role.update({
				entitlements: JSON.stringify(permissions)
			})
		).unwrap();

		return {
			success: true
		};
	});

	Role.callListen('grant-role', async (event, data) => {
		if (!event.locals.account) {
			terminal.log('Not logged in');
			return {
				success: false,
				reason: 'Not logged in'
			};
		}
		const parsed = z
			.object({
				roleId: z.string(),
				accountId: z.string()
			})
			.safeParse(data);

		if (!parsed.success) {
			return {
				success: false,
				reason: 'Invalid data'
			};
		}

		const role = (await Role.fromId(parsed.data.roleId)).unwrap();
		const account = (await Account.Account.fromId(parsed.data.accountId)).unwrap();

		if (!role) {
			return {
				success: false,
				reason: 'Role not found'
			};
		}

		if (!account) {
			return {
				success: false,
				reason: 'Account not found'
			};
		}

		const universe = (await Universes.Universe.fromId(role.data.universe)).unwrap();

		if (!universe) {
			return {
				success: false,
				reason: 'Universe not found'
			};
		}

		const grant = () => {
			return giveRole(account, role).then((res) => {
				return {
					success: res.isOk()
				};
			});
		};

		if ((await Account.isAdmin(event.locals.account)).unwrap()) {
			return grant();
		}

		const roles = (await getUniverseAccountRoles(event.locals.account, universe)).unwrap();
		if (!(await isEntitled(roles, 'manage-roles')).unwrap()) {
			return {
				success: false,
				reason: 'Not entitled'
			};
		}

		return grant();
	});

	Role.callListen('revoke-role', async (event, data) => {
		if (!event.locals.account) {
			return {
				success: false,
				reason: 'Not logged in'
			};
		}
		const parsed = z
			.object({
				roleId: z.string(),
				accountId: z.string()
			})
			.safeParse(data);

		if (!parsed.success) {
			return {
				success: false,
				reason: 'Invalid data'
			};
		}

		const role = (await Role.fromId(parsed.data.roleId)).unwrap();
		const account = (await Account.Account.fromId(parsed.data.accountId)).unwrap();

		if (!role) {
			return {
				success: false,
				reason: 'Role not found'
			};
		}

		if (!account) {
			return {
				success: false,
				reason: 'Account not found'
			};
		}

		const universe = (await Universes.Universe.fromId(role.data.universe)).unwrap();

		if (!universe) {
			return {
				success: false,
				reason: 'Universe not found'
			};
		}

		const remove = () => {
			RoleAccount.fromProperty('role', role.id, {
				type: 'stream'
			}).pipe((ra) => {
				if (ra.data.account === account.id) {
					ra.delete();
				}
			});

			return {
				success: true
			};
		};

		if ((await Account.isAdmin(event.locals.account)).unwrap()) {
			return remove();
		}

		const roles = (await getUniverseAccountRoles(event.locals.account, universe)).unwrap();
		if (!(await isEntitled(roles, 'manage-roles')).unwrap()) {
			return {
				success: false,
				reason: 'Not entitled'
			};
		}

		return remove();
	});

	// Role.callListen('update-links', async (event, data) => {});

	// Role.callListen('update-role', async (event, data) => {});

	export type RoleData = typeof Role.sample;

	export const entitlementsFromRole = async (role: RoleData) => {
		return attemptAsync(async () => {
			const entitlements = z.array(z.string()).parse(JSON.parse(role.data.entitlements));
			return resolveAll<EntitlementPermission>(
				await Promise.all(
					entitlements.map((e) => {
						return readEntitlement(e as Entitlement);
					})
				)
			).unwrap();
		});
	};

	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			role: text('role').notNull(),
			account: text('account').notNull()
		},
		frontend: false
	});

	export type RoleAccountData = typeof RoleAccount.sample;

	export const getRolesFromUniverse = async (universe: Universes.UniverseData) => {
		return Role.fromProperty('universe', universe.id, {
			type: 'stream'
		}).await();
	};

	export const entitlementsFromRoles = (roles: RoleData[]) => {
		return attemptAsync(async () => {
			return resolveAll(await Promise.all(roles.map((r) => entitlementsFromRole(r))))
				.unwrap()
				.flat();
		});
	};

	export const isEntitled = (roles: RoleData[], ...entitlements: Entitlement[]) => {
		return attemptAsync(async () => {
			const has = (await entitlementsFromRoles(roles)).unwrap();
			return has.some((e) => entitlements.includes(e.name));
		});
	};

	export const getUniverseAccountRoles = async (
		account: Account.AccountData,
		universe: Universes.UniverseData
	) => {
		return attemptAsync(async () => {
			const data = await DB.select()
				.from(Role.table)
				.innerJoin(RoleAccount.table, eq(Role.table.id, RoleAccount.table.role))
				.where(
					and(eq(RoleAccount.table.account, account.id), eq(Role.table.universe, universe.id))
				);

			return data.map((d) => Role.Generator(d.role));
		});
	};

	export const allAccountRoles = async (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const roleAccounts = (
				await RoleAccount.fromProperty('account', account.id, {
					type: 'stream'
				}).await()
			).unwrap();
			return resolveAll(
				await Promise.all(roleAccounts.map(async (ra) => Role.fromId(ra.data.role)))
			)
				.unwrap()
				.filter(Boolean) as RoleData[];
		});
	};

	export const giveRole = async (account: Account.AccountData, role: RoleData) => {
		return attemptAsync(async () => {
			if (role.data.name !== 'root') {
				const roles = (await allAccountRoles(account)).unwrap();
				if (roles.find((r) => r.id === role.id)) {
					return;
				}
			}

			return (
				await RoleAccount.new({
					role: role.id,
					account: account.id
				})
			).unwrap();
		});
	};

	export const getRoleAccount = async (account: Account.AccountData, role: RoleData) => {
		return attemptAsync(async () => {
			const [data] = await DB.select()
				.from(RoleAccount.table)
				.where(and(eq(RoleAccount.table.account, account.id), eq(RoleAccount.table.role, role.id)));
			if (data) {
				return RoleAccount.Generator(data);
			}
		});
	};

	// TODO: This isn't really typed correctly. As of right now, the output is using the generic Struct<Blank, string> type rather than the actual struct type that's passed in.
	export const filterAction = async <
		S extends Struct<Blank, string>,
		D extends StructData<S['data']['structure'], S['data']['name']>
	>(
		roles: RoleData[],
		data: D[],
		action: PropertyAction
	): Promise<Result<Partial<Structable<S['data']['structure']>>[]>> => {
		return attemptAsync(async () => {
			if (
				data.filter((v, i, a) => a.findIndex((d) => d.struct.name === v.struct.name) === i).length >
				1
			) {
				throw new DataError(Role, 'Data must be from the same struct');
			}

			const struct = data[0].struct.name;
			if (!struct) {
				return [];
			}

			const universes = roles.map((r) => r.data.universe);
			const allEntitlements = resolveAll(
				await Promise.all(roles.map((r) => entitlementsFromRole(r)))
			)
				.unwrap()
				.flat();

			const usedEntitlements = allEntitlements
				// TODO: if action is readversionhistory or readarchive, properties should be filtered by the read permissions
				.filter((ent) =>
					ent.permissions.some(
						(perm) =>
							(perm.struct === '*' ? ent.structs.includes(struct) : perm.struct === struct) &&
							(perm.action === action || perm.action === '*')
					)
				);

			return data
				.filter((d) => {
					// const dataUniverses = d.getUniverses().unwrap();
					// return dataUniverses.some((du) => universes.includes(du));
					return universes.includes(d.universe);
				})
				.map((d) => {
					const properties: string[] = usedEntitlements
						.map((e) => e.permissions.map((perm) => perm.property))
						.flat()
						.concat('id', 'created', 'updated', 'archived', 'universe', 'lifetime', 'attributes')
						.filter((v, i, a) => a.indexOf(v) === i)
						.filter(Boolean) as string[];

					if (properties.includes('*')) {
						return d.safe();
					}
					const data = d.safe();

					return Object.fromEntries(properties.map((p) => [p, data[p]])) as Partial<
						Structable<S['data']['structure']>
					>;
				});
		});
	};

	export const filterActionPipeline = <
		S extends Struct<Blank, string>,
		Stream extends StructStream<S['data']['structure'], S['data']['name']>
	>(
		account: Account.AccountData,
		roles: RoleData[],
		stream: Stream,
		action: PropertyAction,
		bypass: ((account: Account.AccountData, data?: StructData<Blank, string>) => boolean)[]
	) => {
		const newStream = new Stream<Partial<Structable<S['data']['structure']>>>();

		setTimeout(async () => {
			const universes = roles.map((r) => r.data.universe);

			const entitlements = resolveAll(await Promise.all(roles.map((r) => entitlementsFromRole(r))))
				.unwrap()
				.flat()
				.filter(
					(ent) =>
						ent.permissions.some(
							(perm) =>
								(perm.struct === '*'
									? ent.structs.includes(stream.struct.data.name)
									: perm.struct === stream.struct.data.name) &&
								(perm.action === action || perm.action === '*')
						)
					// e.structs === stream.struct.data.name
				);

			stream.pipe((d) => {
				if (bypass.some((b) => b(account, d))) {
					return newStream.add(d.safe());
				}

				// const dataUniverses = d.getUniverses().unwrap();
				// if (dataUniverses.some((du) => universes.includes(du))) {
				// console.log('Universe:', d.universe);
				if (universes.includes(d.universe)) {
					const { data } = d;
					const properties = entitlements
						.map((e) => e.permissions.map((p) => p.property))
						.flat()
						.filter(Boolean)
						.concat(
							'id',
							'created',
							'updated',
							'archived',
							// 'universes',
							'universe',
							'lifetime',
							'attributes',
							'canUpdate'
						)
						.filter((v, i, a) => a.indexOf(v) === i);
					if (properties.includes('*')) {
						return newStream.add(d.safe());
					}
					newStream.add(
						Object.fromEntries(properties.map((p) => [p, data[p]])) as Partial<
							Structable<S['data']['structure']>
						>
					);
				}
			});
		});

		return newStream;
	};

	export const canDo = (roles: RoleData[], struct: Struct, action: DataAction) => {
		return attemptAsync(async () => {
			if (!struct) throw new Error('Struct not found');
			const entitlements = resolveAll(await Promise.all(roles.map((r) => entitlementsFromRole(r))))
				.unwrap()
				.flat();
			// console.log(JSON.stringify(entitlements, null, 4));
			const res = entitlements.some((e) =>
				e.permissions.some(
					(p) => (p.action === action || p.action === '*') && e.structs === struct.data.name
				)
			);
			return res;
		});
	};

	export const canAccess = (
		roles: RoleData[],
		link: string,
		linkUniverse: Universes.UniverseData
	) => {
		return attemptAsync(async () => {
			if (!roles.some((r) => r.data.universe === linkUniverse.id)) {
				return false;
			}
			return resolveAll(await Promise.all(roles.map((r) => entitlementsFromRole(r))))
				.unwrap()
				.flat()
				.filter((e) => e.pages.includes(link) || e.pages.includes('*'));
		});
	};

	export const usersFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Account.Account.table)
				.innerJoin(RoleAccount.table, eq(Account.Account.table.id, RoleAccount.table.account))
				.where(eq(RoleAccount.table.role, role.id));
			return res.map((r) => Account.Account.Generator(r.account));
		});
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
