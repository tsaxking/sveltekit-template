/**
 * @fileoverview Permission management RPC endpoints (roles, rulesets, entitlements).
 *
 * Each `query()`/`command()` curries a handler with a Zod schema that validates
 * inputs at the boundary, enabling type-safe and permission-safe usage on both
 * client and server.
 *
 * @example
 * import * as permRemote from '$lib/remotes/permissions.remote';
 * const roles = await permRemote.searchRoles({ searchKey: 'admin', limit: 10, page: 0 });
 */
import { command, query } from '$app/server';
import z from 'zod';
import { getAccount, isAdmin } from './index.remote';
import { error } from '@sveltejs/kit';
import { Permissions } from '$lib/server/structs/permissions';
import { PropertyAction } from '$lib/types/struct';
import { Account } from '$lib/server/structs/account';
import { DB } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { type Entitlement } from '$lib/types/entitlements';
import terminal from '$lib/server/utils/terminal';

/**
 * Searches roles by name with pagination.
 *
 * @param {object} params - Search parameters.
 * @param {string} params.searchKey - Partial role name to search.
 * @param {number} params.limit - Max results per page.
 * @param {number} params.page - Page index.
 */
export const searchRoles = query(
	z.object({
		searchKey: z.string().min(1).max(32),
		limit: z.number().min(1).max(100).default(10),
		page: z.number().min(0).default(0)
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const roles = await Permissions.searchRoles(data.searchKey, {
			offset: data.page * data.limit,
			limit: data.limit
		});
		if (roles.isErr()) {
			return error(500, 'Internal server error');
		}

		const res = await Permissions.filterPropertyActionFromAccount(
			account,
			roles.value,
			PropertyAction.Read
		);
		if (res.isOk()) {
			return res.value;
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

/**
 * Creates a role under a parent, enforcing hierarchy permissions.
 *
 * @param {object} params - Create parameters.
 * @param {string} params.name - Role name.
 * @param {string} params.description - Role description.
 * @param {string} params.parent - Parent role id.
 * @param {string} params.color - Hex color string.
 */
export const createRole = command(
	z.object({
		name: z.string().min(3).max(32),
		description: z.string().min(0).max(255),
		parent: z.string(),
		color: z.string().refine((val) => /^#([0-9A-F]{3}){1,2}$/i.test(val), {
			message: 'Invalid color format'
		})
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const parentRole = await Permissions.Role.fromId(data.parent);
		if (parentRole.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!parentRole.value) {
			return {
				success: false,
				message: 'No parent role found'
			};
		}

		PERMIT: {
			if (await isAdmin()) {
				break PERMIT;
			}
			// if an account has that role or higher in the hierarchy, they can create child roles.
			const highestRole = await Permissions.getHighestLevelRole(parentRole.value, account, true);
			if (highestRole.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!highestRole.value) {
				return {
					success: false,
					message:
						'You do not have permission to create a role under this parent role. You must have the parent role or a role higher in the hierarchy and possess the necessary permissions.'
				};
			}

			const attrs = parentRole.value.getAttributes();
			if (attrs.isErr()) {
				terminal.log(
					'Corrupted role attributes detected',
					'warn',
					attrs.error,
					'Role:',
					parentRole.value.id
				);
				return error(500, 'Internal Server Error');
			}

			const canCreate = await Permissions.canCreate(account, Permissions.Role, attrs.value);
			if (canCreate.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canCreate.value) {
				return {
					success: false,
					message: 'You do not have permission to create a role under this parent role'
				};
			}

			// Ensure there are no duplicate names within the whole system
			const [upper, lower] = await Promise.all([
				Permissions.getUpperHierarchy(parentRole.value, true),
				Permissions.getLowerHierarchy(parentRole.value, true)
			]);

			if (upper.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (lower.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (
				[...upper.value, ...lower.value].some(
					(r) => r.data.name.toLowerCase() === data.name.toLowerCase()
				)
			) {
				return {
					success: false,
					message: 'A role with this name already exists in the hierarchy.'
				};
			}
		}

		const res = await Permissions.Role.new({
			name: data.name,
			description: data.description,
			parent: data.parent,
			color: data.color
		});

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		} else {
			return {
				success: true,
				role: res.value
			};
		}
	}
);

/**
 * Determines whether `self` can manage `data.account` membership for `data.role`.
 *
 * @param {Account.AccountData} self - Acting account.
 * @param {object} data - Target data.
 * @param {Permissions.RoleData} data.role - Role being managed.
 * @param {Account.AccountData} data.account - Account being managed.
 * @returns {Promise<true|string>} True if permitted, otherwise an error message.
 */
const canManage = async (
	self: Account.AccountData,
	data: {
		role: Permissions.RoleData;
		account: Account.AccountData;
	}
) => {
	if (await isAdmin()) {
		return true;
	}

	// account should be in the role or higher and be granted permission to manage members
	const hierarchy = await Permissions.getUpperHierarchy(data.role, true);
	if (hierarchy.isErr()) {
		return error(500, 'Internal Server Error');
	}
	const accountRoles = await Permissions.getRolesFromAccountWithinHierarchy(
		data.account,
		hierarchy.value
	);
	if (accountRoles.isErr()) {
		return error(500, 'Internal Server Error');
	}
	if (accountRoles.value.length === 0) {
		return 'You are not a member of a parent role or the role itself, you cannot manage its membership';
	}

	const rulesets = await Permissions.getRulesetsfromRoles(accountRoles.value);
	if (rulesets.isErr()) {
		return error(500, 'Internal Server Error');
	}
	if (!rulesets.value.some((r) => r.data.entitlement === 'manage-members')) {
		return 'You do not have permission to manage members of this role';
	}

	return true;
};

/**
 * Adds an account to a role if the caller can manage membership.
 *
 * @param {object} params - Membership parameters.
 * @param {string} params.role - Role id.
 * @param {string} params.account - Account id.
 */
export const addToRole = command(
	z.object({
		role: z.string(),
		account: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!role.value) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const accountToAdd = await Account.Account.fromId(data.account);
		if (accountToAdd.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!accountToAdd.value) {
			return {
				success: false,
				message: 'Account to add not found'
			};
		}

		const canManageResult = await canManage(account, {
			role: role.value,
			account: accountToAdd.value
		});
		if (canManageResult !== true) {
			return {
				success: false,
				message: canManageResult as string
			};
		}

		const isInRole = await Permissions.isInRole(role.value, accountToAdd.value);
		if (isInRole.isErr()) {
			return error(500, 'Internal Server Error');
		}

		if (isInRole.value) {
			return {
				success: false,
				message: 'Account is already in role'
			};
		}

		const res = await Permissions.RoleAccount.new({
			role: role.value.id,
			account: accountToAdd.value.id
		});

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}

		return {
			success: true
		};
	}
);

/**
 * Removes an account from a role if the caller can manage membership.
 *
 * @param {object} params - Membership parameters.
 * @param {string} params.role - Role id.
 * @param {string} params.account - Account id.
 */
export const removeFromRole = command(
	z.object({
		role: z.string(),
		account: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}
		const res = await DB.select()
			.from(Permissions.RoleAccount.table)
			.where(
				and(
					eq(Permissions.RoleAccount.table.role, data.role),
					eq(Permissions.RoleAccount.table.account, data.account)
				)
			)
			.limit(1);

		if (res.length === 0) {
			return {
				success: false,
				message: 'Account is not in role'
			};
		}

		const ra = Permissions.RoleAccount.Generator(res[0]);

		if (ra.data.account === account.id) {
			const role = await Permissions.Role.fromId(data.role);
			if (role.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!role.value) {
				return {
					success: false,
					message: 'Role not found'
				};
			}

			const upper = await Permissions.getUpperHierarchy(role.value, false);
			if (upper.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (upper.value.length === 0) {
				return {
					success: false,
					message:
						'You cannot remove yourself from this role because you are a top-level role. You can only be removed by another member of the role or a parent role.'
				};
			}

			const inHigherRoles = await Permissions.getRolesFromAccountWithinHierarchy(
				account,
				upper.value
			);
			if (inHigherRoles.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (inHigherRoles.value.length === 0) {
				return {
					success: false,
					message:
						'You cannot remove yourself from this role because you are a member of a top-level role. You can only be removed by another member of the role or a parent role.'
				};
			}
		}

		const accountToRemove = await Account.Account.fromId(ra.data.account);
		if (accountToRemove.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!accountToRemove.value) {
			return {
				success: false,
				message: 'Account to remove not found'
			};
		}

		const role = await Permissions.Role.fromId(ra.data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!role.value) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const canManageResult = await canManage(account, {
			role: role.value,
			account: accountToRemove.value
		});
		if (canManageResult !== true) {
			return {
				success: false,
				message: canManageResult as string
			};
		}

		const deleteRes = await ra.delete();
		if (deleteRes.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return {
			success: true
		};
	}
);

/**
 * Returns permissions for the current account.
 */
export const myPermissions = query(async () => {
	const account = await getAccount();
	if (!account) {
		return error(401, 'Unauthorized');
	}

	const rs = await Permissions.getRulesetsFromAccount(account);
	if (rs.isOk()) {
		return rs.value.filter(
			(r) => r.struct.name === 'role_rulesets'
		) as Permissions.RoleRulesetData[];
	} else {
		return error(500, 'Internal Server Error');
	}
});

/**
 * Returns rulesets/permissions for a given role.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.role - Role id.
 */
export const permissionsFromRole = query(
	z.object({
		role: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}

		if (!role.value) {
			return error(404, 'Role not found');
		}
		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}
			// If the account is at or higher than the role's level, they can view the rulesets
			const parent = await Permissions.getHighestLevelRole(role.value, account, true);
			if (parent.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!parent.value) {
				throw new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			throw new Error('No Authenticated account found');
		}

		const res = await Permissions.getRulesetsFromRole(role.value);
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return res.value.map((r) => r.safe());
	}
);

/**
 * Returns available permissions a role can be granted.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.role - Role id.
 */
export const availablePermissions = query(
	z.object({
		role: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!role.value) {
			return error(404, 'Role not found');
		}

		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}
			// If the account is higher than the role's level, they can view the rulesets
			const parent = await Permissions.getHighestLevelRole(role.value, account, false);
			if (parent.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!parent.value) {
				throw new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			return error(401, 'Unauthorized');
		}

		if (!role.value.data.parent) {
			const res = await Permissions.getRulesetsFromRole(role.value);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			return res.value.map((r) => r.safe());
		}

		const parent = await Permissions.getParent(role.value);
		if (parent.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!parent.value) {
			return error(500, 'Parent role not found');
		}

		const rulesets = await Permissions.getRulesetsFromRole(parent.value);
		if (rulesets.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return rulesets.value.map((r) => r.safe());
	}
);

/**
 * Grants a ruleset to a role.
 *
 * @param {object} params - Grant parameters.
 * @param {string} params.role - Role id.
 * @param {string} params.ruleset - Ruleset id.
 */
export const grantRolePermission = command(
	z.object({
		role: z.string(),
		ruleset: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!role.value) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const ruleset = await Permissions.RoleRuleset.fromId(data.ruleset);
		if (ruleset.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!ruleset.value) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}

			const entitlement = await Permissions.Entitlement.get(
				{
					name: ruleset.value.data.entitlement
				},
				{
					type: 'single'
				}
			);
			if (entitlement.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!entitlement.value) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			// Not inclusive because we want to check if the user is able to grant permissions on the role itself.
			// A user cannot grant permissions to a role that is not in their hierarchy or is the highest level role they are a part of.
			const highestLevelRole = await Permissions.getHighestLevelRole(role.value, account, false);
			if (highestLevelRole.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!highestLevelRole.value) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			// these rulesets are the only ones that can be granted to child roles.
			const rulesets = await Permissions.getRulesetsFromRole(highestLevelRole.value);
			if (rulesets.isErr()) {
				return error(500, 'Internal Server Error');
			}
			const e = entitlement.value;
			const r = ruleset.value;
			// Check to see if the managing account has the permission they're attempting to grant
			if (
				!rulesets.value.some(
					(rr) =>
						rr.data.entitlement === e.data.name &&
						rr.data.targetAttribute === r.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to grant this entitlement on this target attribute'
				};
			}

			// check to see if they already have this permission
			const existing = await Permissions.getRoleRuleset(
				role.value,
				entitlement.value.data.name,
				ruleset.value.data.targetAttribute
			);
			if (existing.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (existing.value) {
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
		const res = await Permissions.grantRoleRuleset({
			role: role.value,
			entitlement: ruleset.value.data.entitlement as Entitlement,
			targetAttribute: ruleset.value.data.targetAttribute,
			featureScopes: (JSON.parse(ruleset.value.data.featureScopes) as string[]) || [],
			parentRuleset: ruleset.value,
			name: ruleset.value.data.name,
			description: ruleset.value.data.description
		});

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	}
);

/**
 * Revokes a ruleset from a role.
 *
 * @param {object} params - Revoke parameters.
 * @param {string} params.ruleset - Ruleset id.
 */
export const revokeRolePermission = command(
	z.object({
		ruleset: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const ruleset = await Permissions.RoleRuleset.fromId(data.ruleset);
		if (ruleset.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!ruleset.value) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		const role = await Permissions.Role.fromId(ruleset.value.data.role);
		if (role.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!role.value) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const entitlement = await Permissions.Entitlement.get(
			{
				name: ruleset.value.data.entitlement
			},
			{
				type: 'single'
			}
		);
		if (entitlement.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!entitlement.value) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}

			const highestLevelRole = await Permissions.getHighestLevelRole(role.value, account, false);
			if (highestLevelRole.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!highestLevelRole.value) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			const rulesets = await Permissions.getRulesetsFromRole(highestLevelRole.value);
			if (rulesets.isErr()) {
				return error(500, 'Internal Server Error');
			}
			const r = ruleset.value;
			const e = entitlement.value;
			// Check to see if the managing account has the permission they're attempting to revoke
			if (
				!rulesets.value.some(
					(rr) =>
						rr.data.entitlement === e.data.name &&
						rr.data.targetAttribute === r.data.targetAttribute
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

		const res = await Permissions.revokeRoleRuleset(
			role.value,
			entitlement.value.data.name as Entitlement,
			ruleset.value.data.targetAttribute
		);

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}

		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	}
);

/**
 * Returns account-specific rulesets for the current account.
 */
export const myAccountPermissions = query(async () => {
	const account = await getAccount();
	if (!account) {
		return error(401, 'Unauthorized');
	}

	if (!account) {
		throw new Error('No Authenticated account found');
	}

	const rs = await Permissions.getRulesetsFromAccount(account);
	if (rs.isErr()) {
		return error(500, 'Internal Server Error');
	}
	return rs.value.filter(
		(r) => r.struct.name === 'account_rulesets'
	) as Permissions.AccountRulesetData[];
});

/**
 * Grants an entitlement to an account.
 *
 * @param {object} params - Grant parameters.
 * @param {string} params.account - Account id.
 * @param {string} params.entitlement - Entitlement id.
 * @param {string} params.targetAttribute - Attribute target id.
 * @param {string[]} [params.featureScopes] - Feature scopes.
 */
export const grantAccountPermission = command(
	z.object({
		account: z.string(),
		entitlement: z.string(),
		targetAttribute: z.string(),
		featureScopes: z.array(z.string())
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}

			const entitlement = await Permissions.Entitlement.get(
				{
					name: data.entitlement
				},
				{
					type: 'single'
				}
			);
			if (entitlement.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!entitlement.value) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			const accountToGrant = await Account.Account.fromId(data.account);
			if (accountToGrant.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!accountToGrant.value) {
				return {
					success: false,
					message: 'Account not found'
				};
			}

			const rulesets = await Permissions.getRulesetsFromAccount(account);
			if (rulesets.isErr()) {
				return error(500, 'Internal Server Error');
			}
			const e = entitlement.value;
			if (
				!rulesets.value.some(
					(rr) =>
						rr.data.entitlement === e.data.name && rr.data.targetAttribute === data.targetAttribute
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

		const res = await Permissions.AccountRuleset.new({
			account: data.account,
			entitlement: data.entitlement,
			targetAttribute: data.targetAttribute,
			featureScopes: JSON.stringify(data.featureScopes)
		});

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	}
);

/**
 * Revokes an account ruleset.
 *
 * @param {object} params - Revoke parameters.
 * @param {string} params.ruleset - Ruleset id.
 */
export const revokeAccountPermission = command(
	z.object({
		ruleset: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const ruleset = await Permissions.AccountRuleset.fromId(data.ruleset);
		if (ruleset.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!ruleset.value) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		const entitlement = await Permissions.Entitlement.get(
			{
				name: ruleset.value.data.entitlement
			},
			{
				type: 'single'
			}
		);
		if (entitlement.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!entitlement.value) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		const accountToGrant = await Account.Account.fromId(ruleset.value.data.account);
		if (accountToGrant.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!accountToGrant.value) {
			return {
				success: false,
				message: 'Account not found'
			};
		}

		PERMIT: if (account) {
			if (await isAdmin()) {
				break PERMIT;
			}

			const rulesets = await Permissions.getRulesetsFromAccount(account);
			if (rulesets.isErr()) {
				return error(500, 'Internal Server Error');
			}
			const r = ruleset.value;
			const e = entitlement.value;
			if (
				!rulesets.value.some(
					(rr) =>
						rr.data.entitlement === e.data.name &&
						rr.data.targetAttribute === r.data.targetAttribute
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

		if (!ruleset.value) {
			return {
				success: false,
				message: 'This account does not have this permission'
			};
		}

		const res = await ruleset.value.delete();
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	}
);
