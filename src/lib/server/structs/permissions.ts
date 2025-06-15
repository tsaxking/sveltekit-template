/* eslint-disable @typescript-eslint/no-explicit-any */
import { text } from 'drizzle-orm/pg-core';
import {
	DataVersion,
	Struct,
	StructData,
	type Blank,
	type Structable
} from 'drizzle-struct/back-end';
import { attempt, attemptAsync, resolveAll } from 'ts-utils/check';
import { Account } from './account';
import { PropertyAction, DataAction } from 'drizzle-struct/types';
import { DB } from '../db';
import { and, eq } from 'drizzle-orm';
import type { Entitlement } from '$lib/types/entitlements';
import { z } from 'zod';
import terminal from '../utils/terminal';
import path from 'path';
import fs from 'fs';

export namespace Permissions {
	/**
	 * Blocks all edit on a struct.
	 * @param struct The struct to block actions on.
	 */
	const block = <T extends Blank>(struct: Struct<T, string>) => {
		struct.block(DataAction.Delete, () => true, `Cannot delete ${struct.name}`);
		struct.block(DataAction.Create, () => true, `Cannot create new ${struct.name}`);
		struct.block(PropertyAction.Update, () => true, `Cannot update ${struct.name}`);
		struct.block(DataAction.Archive, () => true, `Cannot archive ${struct.name}`);
		struct.block(DataAction.RestoreArchive, () => true, `Cannot restore ${struct.name}`);
		struct.block(DataAction.DeleteVersion, () => true, `Cannot delete version of ${struct.name}`);
		struct.block(DataAction.RestoreVersion, () => true, `Cannot create version of ${struct.name}`);
	};

	/*
		Top level roles are the admins of a subsystem.
		They can create, delete, and manage child roles.
		The rulesets that apply to them are the ones they can grant to child roles.
	*/
	export const Role = new Struct({
		name: 'role',
		structure: {
			name: text('name').notNull(),
			description: text('description').notNull(),
			parent: text('parent').notNull() // Parent role for hierarchy. A parent role can manage its child roles.
		}
	});

	// Role.callListen('update', async (event, data) => {});

	export const detectCircularHierarchy = (role: RoleData) => {
		return attemptAsync(async () => {
			const visited = new Set<string>();
			let current = role;

			while (current.data.parent) {
				if (visited.has(current.id)) {
					return true;
				}
				visited.add(current.id);

				const parent = await Role.fromId(current.data.parent).unwrap();
				if (!parent) break;

				current = parent;
			}

			return false;
		});
	};

	Role.on('create', async (role) => {
		if (await detectCircularHierarchy(role).unwrap()) {
			terminal.error(`Circular hierarchy detected for role ${role.id}. Setting parent to empty.`);
			role
				.update({
					parent: ''
				})
				.unwrap();
		}
	});

	Role.on('update', async ({ to }) => {
		if (await detectCircularHierarchy(to).unwrap()) {
			terminal.error(`Circular hierarchy detected for role ${to.id}. Setting parent to empty.`);
			to.update({
				parent: ''
			}).unwrap();
		}
	});

	Role.on('delete', async (role) => {
		const parent = await getParent(role).unwrap();
		Role.fromProperty('parent', role.id, { type: 'stream' }).pipe(async (child) => {
			if (parent) {
				const res = await child.update({
					parent: parent.id
				});
				if (res.isErr()) {
					terminal.error(
						`Failed to update child role ${child.id} to parent ${parent.id}: ${res.error}. You may now have orphaned roles.`
					);
				}
			} else {
				// if admin role is deleted, all children should be deleted as well.
				child.delete();
			}
		});
		RoleAccount.fromProperty('role', role.id, { type: 'stream' }).pipe((ra) => {
			ra.delete();
		});
		RoleRuleset.fromProperty('role', role.id, { type: 'stream' }).pipe((rr) => {
			rr.delete();
		});
	});

	block(Role);

	export type RoleData = typeof Role.sample;

	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			role: text('role').notNull(),
			account: text('account').notNull()
		}
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
		}
	});

	Entitlement.bypass(PropertyAction.Read, () => true); // Allow reading entitlements without permission checks

	block(Entitlement);

	export type EntitlementData = typeof Entitlement.sample;

	export const RoleRuleset = new Struct({
		name: 'role_rulesets',
		structure: {
			role: text('role').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull(),
			reason: text('reason').notNull()
		}
	});

	block(RoleRuleset);

	RoleRuleset.queryListen('my-permissions', async (event) => {
		if (!event.locals.account) {
			return new Error('No Authenticated account found');
		}

		const rs = await getRulesetsFromAccount(event.locals.account).unwrap();
		return rs.filter((r) => r.struct.name === 'role_rulesets') as RoleRulesetData[];
	});

	RoleRuleset.queryListen('from-role', async (event, data) => {
		const body = z
			.object({
				role: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return new Error('Invalid request body');
		}

		const role = await Role.fromId(body.data.role).unwrap();
		if (!role) {
			return new Error('Role not found');
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}
			// If the account is at or higher than the role's level, they can view the rulesets
			const parent = await getHighestLevelRole(role, event.locals.account, true).unwrap();
			if (!parent) {
				return new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			return new Error('No Authenticated account found');
		}
		return getRulesetsFromRole(role).unwrap();
	});
	RoleRuleset.queryListen('available-permissions', async (event, data) => {
		const body = z
			.object({
				role: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return new Error('Invalid request body');
		}

		const role = await Role.fromId(body.data.role).unwrap();
		if (!role) {
			return new Error('Role not found');
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}
			// If the account is higher than the role's level, they can view the rulesets
			const parent = await getHighestLevelRole(role, event.locals.account, false).unwrap();
			if (!parent) {
				return new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			return new Error('No Authenticated account found');
		}

		const parent = await getParent(role).unwrap();
		if (!parent) {
			return new Error('No parent role found for this role');
		}

		return getRulesetsFromRole(parent).unwrap();
	});

	export const getTopLevelRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const visited = new Set<string>(); // prevent circular parent loops
			let current = role;

			while (current.data.parent) {
				if (visited.has(current.id)) throw new Error('Circular role hierarchy detected');
				visited.add(current.id);

				const parent = await Role.fromId(current.data.parent).unwrap();
				if (!parent) break;

				current = parent;
			}

			return current;
		});
	};

	export const getParent = (role: RoleData) => {
		return attemptAsync(async () => {
			if (!role.data.parent) return null; // No parent role

			const parent = await Role.fromId(role.data.parent).unwrap();
			if (!parent) return null; // Parent role not found

			return parent;
		});
	};

	/**
	 * Gets the child roles of a given role.
	 * @param role The role to get the children for.
	 * @returns  A promise that resolves to an array of child roles.
	 */
	export const getChildren = (role: RoleData) => {
		return Role.fromProperty('parent', role.id, {
			type: 'all'
		});
	};

	/**
	 * Gets the hierarchy of roles from the given role to its top-level admin.
	 * This will traverse up the hierarchy until it reaches the top-level role (the one with no parent).
	 * @param role The role to get the hierarchy for.
	 * @param inclusive Whether to include the role itself in the hierarchy.
	 * @returns  A promise that resolves to an array of roles in the hierarchy from its local admin to the role given.
	 */
	export const getHierarchy = (role: RoleData, inclusive: boolean) => {
		return attemptAsync(async () => {
			const visited = new Set<string>();
			const hierarchy: RoleData[] = [];

			const traverse = async (current: RoleData) => {
				if (visited.has(current.id)) throw new Error('Circular role hierarchy detected');
				visited.add(current.id);
				hierarchy.push(current);

				const parent = await getParent(current).unwrap();
				if (parent) {
					await traverse(parent); // Recursively traverse up the hierarchy
				} else {
					// If no parent, we reached the top of the hierarchy
					return;
				}
			};

			await traverse(role);
			if (!inclusive) {
				hierarchy.shift(); // Remove the role itself if not inclusive
			}
			return hierarchy.reverse(); // Return from top to bottom
		});
	};

	/**
	 * Gets the highest level role that the account has, starting from a given role.
	 * This will traverse the hierarchy from the startRole and check if the account has that role.
	 * It will return the first role found in the hierarchy that the account has.
	 * If inclusive is true, it will include the startRole in the search.
	 * @param startRole The role to start from.
	 * @param account The account to check against.
	 * @param inclusive Whether to include the startRole in the search.
	 * @returns A promise that resolves to the highest level role the account has within the hierarchy of the given role, or null if none found.
	 */
	export const getHighestLevelRole = (
		startRole: RoleData,
		account: Account.AccountData,
		inclusive: boolean
	) => {
		return attemptAsync(async () => {
			const hierarchy = await getHierarchy(startRole, inclusive).unwrap();
			if (hierarchy.length === 0) return null; // No roles in hierarchy
			const roles = await getRolesFromAccount(account).unwrap();

			for (const role of hierarchy) {
				if (roles.some((r) => r.id === role.id)) {
					return role; // Return the first role found in the account's roles
				}
			}
			return null; // No matching role found in the account's roles
		});
	};

	export const getRoleRuleset = (role: RoleData, entitlement: string, targetAttribute: string) => {
		return attemptAsync(async () => {
			const [res] = await DB.select()
				.from(RoleRuleset.table)
				.where(
					and(
						eq(RoleRuleset.table.role, role.id),
						eq(RoleRuleset.table.entitlement, entitlement),
						eq(RoleRuleset.table.target, targetAttribute)
					)
				);

			if (!res) {
				return null;
			}

			return RoleRuleset.Generator(res);
		});
	};

	/**
	 * Checks if a role is a parent of another role.
	 * @param child The child role to check.
	 * @param potentialParent  The role to check if it is a parent of the child role.
	 * @returns A promise that resolves to true if the potentialParent is a parent of the child role, false otherwise.
	 */
	export const isParent = (child: RoleData, potentialParent: RoleData) => {
		return attemptAsync(async () => {
			if (child.id === potentialParent.id) return false; // A role cannot be its own parent
			if (!child.data.parent) return false; // No parent role to check against
			if (child.data.parent === potentialParent.id) return true; // Direct parent match, no need to check hierarchy

			const hierarchy = await getHierarchy(child, true).unwrap();
			return hierarchy.some((r) => r.id === potentialParent.id);
		});
	};

	export const grantRoleRuleset = (
		role: RoleData,
		entitlement: Entitlement,
		targetAttribute: string,
		reason: string
	) => {
		return attemptAsync(async () => {
			const rs = await getRoleRuleset(role, entitlement, targetAttribute).unwrap();
			if (rs) {
				throw new Error('Role ruleset already exists');
			}
			return RoleRuleset.new({
				role: role.id,
				entitlement,
				target: targetAttribute,
				reason
			}).unwrap();
		});
	};

	export const revokeRoleRuleset = (
		role: RoleData,
		entitlement: Entitlement,
		targetAttribute: string
	) => {
		return attemptAsync(async () => {
			const rs = await getRoleRuleset(role, entitlement, targetAttribute).unwrap();
			if (!rs) throw new Error('Role ruleset not found');
			await rs.delete().unwrap();
		});
	};

	RoleRuleset.callListen('grant-permission', async (event, data) => {
		const body = z
			.object({
				role: z.string(),
				entitlement: z.string(),
				targetAttribute: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return {
				success: false,
				message: 'Invalid request body'
				// code: EventErrorCode.InvalidRequestBody,
			};
		}

		const role = await Role.fromId(body.data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}

			const entitlement = await Entitlement.fromProperty('name', body.data.entitlement, {
				type: 'single'
			}).unwrap();
			if (!entitlement) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			// Not inclusive because we want to check if the user is able to grant permissions on the role itself.
			// A user cannot grant permissions to a role that is not in their hierarchy or is the highest level role they are a part of.
			const highestLevelRole = await getHighestLevelRole(
				role,
				event.locals.account,
				false
			).unwrap();
			if (!highestLevelRole) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			// these rulesets are the only ones that can be granted to child roles.
			const rulesets = await getRulesetsFromRole(highestLevelRole).unwrap();
			// Check to see if the managing account has the permission they're attempting to grant
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.target === body.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to grant this entitlement on this target attribute'
				};
			}

			// check to see if they already have this permission
			const existing = await getRoleRuleset(
				role,
				entitlement.data.name,
				body.data.targetAttribute
			).unwrap();
			if (existing) {
				return {
					success: false,
					message: 'This role already has this permission'
				};
			}

			// All checks have passed
		} else {
			return {
				success: false,
				message: 'No Authenticated account found'
				// code: EventErrorCode.NoAccount,
			};
		}
		grantRoleRuleset(
			role,
			body.data.entitlement as Entitlement,
			body.data.targetAttribute,
			'Permission granted via API'
		);

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	});

	RoleRuleset.callListen('revoke-permission', async (event, data) => {
		const body = z
			.object({
				role: z.string(),
				entitlement: z.string(),
				targetAttribute: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return {
				success: false,
				message: 'Invalid request body'
				// code: EventErrorCode.InvalidRequestBody,
			};
		}

		const role = await Role.fromId(body.data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const entitlement = await Entitlement.fromProperty('name', body.data.entitlement, {
			type: 'single'
		}).unwrap();
		if (!entitlement) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}

			const highestLevelRole = await getHighestLevelRole(
				role,
				event.locals.account,
				false
			).unwrap();
			if (!highestLevelRole) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			const rulesets = await getRulesetsFromRole(highestLevelRole).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.target === body.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to revoke this entitlement on this target attribute'
				};
			}
		} else {
			return {
				success: false,
				message: 'No Authenticated account found'
				// code: EventErrorCode.NoAccount,
			};
		}

		await revokeRoleRuleset(
			role,
			entitlement.data.name as Entitlement,
			body.data.targetAttribute
		).unwrap();

		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	});

	export type RoleRulesetData = typeof RoleRuleset.sample;

	export const AccountRuleset = new Struct({
		name: 'account_rulesets',
		structure: {
			account: text('account').notNull(),
			entitlement: text('entitlement').notNull(),
			target: text('target_attribute').notNull(),
			reason: text('reason').notNull()
		}
	});

	AccountRuleset.queryListen('my-permissions', async (event) => {
		if (!event.locals.account) {
			return new Error('No Authenticated account found');
		}

		const rs = await getRulesetsFromAccount(event.locals.account).unwrap();
		return rs.filter((r) => r.struct.name === 'account_rulesets') as AccountRulesetData[];
	});

	AccountRuleset.callListen('grant-permission', async (event, data) => {
		const body = z
			.object({
				account: z.string(),
				entitlement: z.string(),
				targetAttribute: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return {
				success: false,
				message: 'Invalid request body'
				// code: EventErrorCode.InvalidRequestBody,
			};
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}

			const entitlement = await Entitlement.fromProperty('name', body.data.entitlement, {
				type: 'single'
			}).unwrap();
			if (!entitlement) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			const account = await Account.Account.fromId(body.data.account).unwrap();
			if (!account) {
				return {
					success: false,
					message: 'Account not found'
				};
			}

			const rulesets = await getRulesetsFromAccount(event.locals.account).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.target === body.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to grant this entitlement on this target attribute'
				};
			}
		} else {
			return {
				success: false,
				message: 'No Authenticated account found'
				// code: EventErrorCode.NoAccount,
			};
		}

		AccountRuleset.new({
			account: body.data.account,
			entitlement: body.data.entitlement,
			target: body.data.targetAttribute,
			reason: 'Permission granted via API'
		}).unwrap();

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	});

	AccountRuleset.callListen('revoke-permission', async (event, data) => {
		const body = z
			.object({
				account: z.string(),
				entitlement: z.string(),
				targetAttribute: z.string()
			})
			.safeParse(data);

		if (!body.success) {
			return {
				success: false,
				message: 'Invalid request body'
				// code: EventErrorCode.InvalidRequestBody,
			};
		}

		const entitlement = await Entitlement.fromProperty('name', body.data.entitlement, {
			type: 'single'
		}).unwrap();
		if (!entitlement) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		const account = await Account.Account.fromId(body.data.account).unwrap();
		if (!account) {
			return {
				success: false,
				message: 'Account not found'
			};
		}

		PERMIT: if (event.locals.account) {
			if (await Account.isAdmin(event.locals.account)) {
				break PERMIT;
			}

			const rulesets = await getRulesetsFromAccount(event.locals.account).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.target === body.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to revoke this entitlement on this target attribute'
				};
			}
		} else {
			return {
				success: false,
				message: 'No Authenticated account found'
				// code: EventErrorCode.NoAccount,
			};
		}

		const existing = await DB.select()
			.from(AccountRuleset.table)
			.where(
				and(
					eq(AccountRuleset.table.account, body.data.account),
					eq(AccountRuleset.table.entitlement, body.data.entitlement),
					eq(AccountRuleset.table.target, body.data.targetAttribute)
				)
			);

		if (existing.length === 0) {
			return {
				success: false,
				message: 'This account does not have this permission'
			};
		}

		const ruleset = existing.find(
			(r) =>
				r.account === body.data.account &&
				r.entitlement === body.data.entitlement &&
				r.target === body.data.targetAttribute
		);
		if (!ruleset) {
			return {
				success: false,
				message: 'This account does not have this permission'
			};
		}

		await AccountRuleset.Generator(ruleset).delete().unwrap();
		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	});

	block(AccountRuleset);

	export type AccountRulesetData = typeof AccountRuleset.sample;

	/**
	 * Gets all roles associated with a given account.
	 * @param account The account to get roles for.
	 * @returns A promise that resolves to an array of roles associated with the account.
	 */
	export const getRolesFromAccount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Role.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Role.table.id))
				.where(eq(RoleAccount.table.account, account.id));

			return res.map((r) => Role.Generator(r.role));
		});
	};

	/**
	 * Gets all entitlements associated with a given role.
	 * @param role The role to get entitlements for.
	 * @returns A promise that resolves to an array of entitlements associated with the role.
	 */
	export const getEntitlementsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Entitlement.table)
				.innerJoin(RoleAccount.table, eq(RoleAccount.table.role, Entitlement.table.id))
				.where(eq(RoleAccount.table.role, role.id));
			return res.map((r) => Entitlement.Generator(r.entitlements));
		});
	};

	/**
	 * Gets all entitlements associated with a given account.
	 * @param account The account to get entitlements for.
	 * @returns A promise that resolves to an array of entitlements associated with the account.
	 */
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

	/**
	 * Gets all rulesets associated with a given account.
	 * @param account The account to get rulesets for.
	 * @returns  	A promise that resolves to an array of rulesets associated with the account.
	 */
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

	/**
	 * Gets all rulesets associated with a given role.
	 * @param role The role to get rulesets for.
	 * @returns A promise that resolves to an array of rulesets associated with the role.
	 */
	export const getRulesetsFromRole = (role: RoleData) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(RoleRuleset.table)
				.where(eq(RoleRuleset.table.role, role.id));
			return res.map((r) => RoleRuleset.Generator(r));
		});
	};

	/**
	 * Converts an EntitlementData object into an EntitlementPermission object.
	 * @param entitlement The EntitlementData object to convert.
	 * @returns A Result containing the EntitlementPermission object or an error.
	 */
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

	/**
	 * Checks if the account can create a struct with the given attributes.
	 * @param account The account to check permissions for.
	 * @param struct The struct to check permissions against.
	 * @param attributes The attributes to check permissions for.
	 * @returns A promise that resolves to true if the account can create the struct with the given attributes, false otherwise.
	 */
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

	/**
	 * Checks if the account can perform a specific action on a target attribute of a struct data.
	 * @param entitlement The entitlement data to check permissions against.
	 * @param targetAttribute The target attribute to check permissions for.
	 * @param data The struct data to check permissions against.
	 * @param action The action to check permissions for (DataAction or PropertyAction).
	 * @returns A Result that resolves to true if the account can perform the action, false otherwise.
	 */
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

	/**
	 * Checks if the account can perform a specific action on a struct data.
	 * @param account The account to check permissions for.
	 * @param data The struct data to check permissions against.
	 * @param action The action to check permissions for (DataAction or PropertyAction).
	 * @returns A promise that resolves to an array of booleans indicating if the account can perform the action on each data item.
	 */
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

	/**
	 * Checks if the roles can perform a specific action on a struct data.
	 * @param roles The roles to check permissions for.
	 * @param data The struct data to check permissions against.
	 * @param action The action to check permissions for (DataAction or PropertyAction).
	 * @returns A promise that resolves to an array of booleans indicating if the roles can perform the action on each data item.
	 */
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

	/**
	 * Filters the properties of struct data based on the account's permissions for a specific action.
	 * @param account The account to check permissions for.
	 * @param data The struct data to filter.
	 * @param action The action to filter properties by (PropertyAction).
	 * @returns A promise that resolves to an array of filtered struct data.
	 */
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

	/**
	 * Filters the properties of struct data based on the account's permissions for a specific action.
	 * This is a pipe function that can be used in a StructStream to filter properties based on the account's permissions.
	 * @param account The account to check permissions for.
	 * @param action The action to filter properties by (PropertyAction).
	 * @param callback The callback to call with the filtered data.
	 * @returns A function that takes struct data and filters its properties based on the account's permissions.
	 */
	// TODO: Bypasses
	export const filterPropertyActionPipe = <T extends Blank>(
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

	/**
	 * Retrieves all entitlements from the database.
	 * @returns A promise that resolves to an array of all entitlements.
	 */
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
		await fs.promises.writeFile(
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

	const entitlementCache: {
		timeout?: NodeJS.Timeout;
		toBuilds?: (() => Promise<void>)[] | undefined;
		built: true | undefined;
	} = {
		timeout: undefined,
		toBuilds: [],
		built: undefined
	};
	const onceBuild = async () => {
		if (entitlementCache.toBuilds === undefined) return; // Already built
		if (entitlementCache.built) return; // Already built
		entitlementCache.built = true; // Mark as built to prevent multiple builds
		await Entitlement.clear().unwrap();
		await Promise.all(entitlementCache.toBuilds.map((f) => f()));
		delete entitlementCache.toBuilds; // Clear the toBuilds array
	};

	// This is not wrapped in an attemptAsync because if it fails, this is a critical error that should not be ignored.
	/**
	 * Creates a new entitlement in the database.
	 * This function will overwrite any existing entitlement with the same name.
	 * It will also save the entitlements to a file for type generation.
	 * It will throw an error if the entitlement name is invalid.
	 * The entitlement name must be lowercase and contain only letters, numbers, and hyphens.
	 * @param entitlement The entitlement to create.
	 */
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

			if (entitlementCache.timeout) clearTimeout(entitlementCache.timeout);
			setTimeout(async () => {
				saveEntitlements();
			});
		};

		if (Permissions.Entitlement.built) {
			await run();
		} else {
			entitlementCache.toBuilds?.push(run);
		}
	};

	Permissions.Entitlement.once('build', onceBuild);

	Permissions.createEntitlement({
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
