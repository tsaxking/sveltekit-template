import { command, query } from '$app/server';
import z from 'zod';
import { getAccount } from './index.remote';
import { error } from '@sveltejs/kit';
import { Permissions } from '$lib/server/structs/permissions';
import { PropertyAction } from '$lib/types/struct';
import { Account } from '$lib/server/structs/account';
import { DB } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { type Entitlement } from '$lib/types/entitlements';

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
		).unwrap();
		return res;
	}
);

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

		const parentRole = await Permissions.Role.fromId(data.parent).unwrap();
		if (!parentRole) {
			return {
				success: false,
				message: 'No parent role found'
			};
		}

		PERMIT: {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}
			// if an account has that role or higher in the hierarchy, they can create child roles.
			const highestRole = await Permissions.getHighestLevelRole(parentRole, account, true).unwrap();
			if (!highestRole) {
				return {
					success: false,
					message:
						'You do not have permission to create a role under this parent role. You must have the parent role or a role higher in the hierarchy and possess the necessary permissions.'
				};
			}

			const canCreate = await Permissions.canCreate(
				account,
				Permissions.Role,
				parentRole.getAttributes().unwrap()
			).unwrap();

			if (!canCreate) {
				return {
					success: false,
					message: 'You do not have permission to create a role under this parent role'
				};
			}

			// Ensure there are no duplicate names within the whole system
			const [upper, lower] = await Promise.all([
				Permissions.getUpperHierarchy(parentRole, true).unwrap(),
				Permissions.getLowerHierarchy(parentRole, true).unwrap()
			]);

			if ([...upper, ...lower].some((r) => r.data.name.toLowerCase() === data.name.toLowerCase())) {
				return {
					success: false,
					message: 'A role with this name already exists in the hierarchy.'
				};
			}
		}

		await Permissions.Role.new({
			name: data.name,
			description: data.description,
			parent: data.parent,
			color: data.color
		}).unwrap();

		return {
			success: true,
			data: {}
		};
	}
);

const canManage = async (
	self: Account.AccountData,
	data: {
		role: Permissions.RoleData;
		account: Account.AccountData;
	}
) => {
	if (await Account.isAdmin(self).unwrap()) {
		return true;
	}

	// account should be in the role or higher and be granted permission to manage members
	const hierarchy = await Permissions.getUpperHierarchy(data.role, true).unwrap();
	const accountRoles = await Permissions.getRolesFromAccountWithinHierarchy(
		data.account,
		hierarchy
	).unwrap();
	if (accountRoles.length === 0) {
		return 'You are not a member of a parent role or the role itself, you cannot manage its membership';
	}

	const rulesets = await Permissions.getRulesetsfromRoles(accountRoles).unwrap();
	if (!rulesets.some((r) => r.data.entitlement === 'manage-members')) {
		return 'You do not have permission to manage members of this role';
	}

	return true;
};

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

		const role = await Permissions.Role.fromId(data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const accountToAdd = await Account.Account.fromId(data.account).unwrap();
		if (!accountToAdd) {
			return {
				success: false,
				message: 'Account to add not found'
			};
		}

		const canManageResult = await canManage(account, { role: role, account: accountToAdd });
		if (canManageResult !== true) {
			return {
				success: false,
				message: canManageResult as string
			};
		}

		const isInRole = await Permissions.isInRole(role, accountToAdd).unwrap();

		if (isInRole) {
			return {
				success: false,
				message: 'Account is already in role'
			};
		}

		await Permissions.RoleAccount.new({
			role: role.id,
			account: accountToAdd.id
		}).unwrap();

		return {
			success: true
		};
	}
);

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
			const role = await Permissions.Role.fromId(data.role).unwrap();
			if (!role) {
				return {
					success: false,
					message: 'Role not found'
				};
			}

			const upper = await Permissions.getUpperHierarchy(role, false).unwrap();
			if (upper.length === 0) {
				return {
					success: false,
					message:
						'You cannot remove yourself from this role because you are a top-level role. You can only be removed by another member of the role or a parent role.'
				};
			}

			const inHigherRoles = await Permissions.getRolesFromAccountWithinHierarchy(
				account,
				upper
			).unwrap();
			if (inHigherRoles.length === 0) {
				return {
					success: false,
					message:
						'You cannot remove yourself from this role because you are a member of a top-level role. You can only be removed by another member of the role or a parent role.'
				};
			}
		}

		const accountToRemove = await Account.Account.fromId(ra.data.account).unwrap();
		if (!accountToRemove) {
			return {
				success: false,
				message: 'Account to remove not found'
			};
		}

		const role = await Permissions.Role.fromId(ra.data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const canManageResult = await canManage(account, { role: role, account: accountToRemove });
		if (canManageResult !== true) {
			return {
				success: false,
				message: canManageResult as string
			};
		}

		await ra.delete().unwrap();
		return {
			success: true
		};
	}
);

export const myPermissions = query(async () => {
	const account = await getAccount();
	if (!account) {
		return error(401, 'Unauthorized');
	}

	const rs = await Permissions.getRulesetsFromAccount(account).unwrap();
	return rs.filter((r) => r.struct.name === 'role_rulesets') as Permissions.RoleRulesetData[];
});

export const permissionsFromRole = query(
	z.object({
		role: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role).unwrap();

		if (!role) {
			return error(404, 'Role not found');
		}
		PERMIT: if (account) {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}
			// If the account is at or higher than the role's level, they can view the rulesets
			const parent = await Permissions.getHighestLevelRole(role, account, true).unwrap();
			if (!parent) {
				throw new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			throw new Error('No Authenticated account found');
		}

		return Permissions.getRulesetsFromRole(role).unwrap();
	}
);

export const availablePermissions = query(
	z.object({
		role: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const role = await Permissions.Role.fromId(data.role).unwrap();
		if (!role) {
			return error(404, 'Role not found');
		}

		PERMIT: if (account) {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}
			// If the account is higher than the role's level, they can view the rulesets
			const parent = await Permissions.getHighestLevelRole(role, account, false).unwrap();
			if (!parent) {
				throw new Error("You do not have permission to view this role's rulesets");
			}
		} else {
			return error(401, 'Unauthorized');
		}

		if (!role.data.parent)
			return (await Permissions.getRulesetsFromRole(role).unwrap()).map((r) => r.safe());

		const parent = await Permissions.getParent(role).unwrap();
		if (!parent) {
			return error(500, 'Parent role not found');
		}

		return (await Permissions.getRulesetsFromRole(parent).unwrap()).map((r) => r.safe());
	}
);

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

		const role = await Permissions.Role.fromId(data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const ruleset = await Permissions.RoleRuleset.fromId(data.ruleset).unwrap();
		if (!ruleset) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		PERMIT: if (account) {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}

			const entitlement = await Permissions.Entitlement.get(
				{
					name: ruleset.data.entitlement
				},
				{
					type: 'single'
				}
			).unwrap();
			if (!entitlement) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			// Not inclusive because we want to check if the user is able to grant permissions on the role itself.
			// A user cannot grant permissions to a role that is not in their hierarchy or is the highest level role they are a part of.
			const highestLevelRole = await Permissions.getHighestLevelRole(role, account, false).unwrap();
			if (!highestLevelRole) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			// these rulesets are the only ones that can be granted to child roles.
			const rulesets = await Permissions.getRulesetsFromRole(highestLevelRole).unwrap();
			// Check to see if the managing account has the permission they're attempting to grant
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.targetAttribute === ruleset.data.targetAttribute
				)
			) {
				return {
					success: false,
					message: 'You do not have permission to grant this entitlement on this target attribute'
				};
			}

			// check to see if they already have this permission
			const existing = await Permissions.getRoleRuleset(
				role,
				entitlement.data.name,
				ruleset.data.targetAttribute
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
		Permissions.grantRoleRuleset({
			role: role,
			entitlement: ruleset.data.entitlement as Entitlement,
			targetAttribute: ruleset.data.targetAttribute,
			featureScopes: (JSON.parse(ruleset.data.featureScopes) as string[]) || [],
			parentRuleset: ruleset,
			name: ruleset.data.name,
			description: ruleset.data.description
		});

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	}
);

export const revokeRolePermission = command(
	z.object({
		ruleset: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const ruleset = await Permissions.RoleRuleset.fromId(data.ruleset).unwrap();
		if (!ruleset) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		const role = await Permissions.Role.fromId(ruleset.data.role).unwrap();
		if (!role) {
			return {
				success: false,
				message: 'Role not found'
			};
		}

		const entitlement = await Permissions.Entitlement.get(
			{
				name: ruleset.data.entitlement
			},
			{
				type: 'single'
			}
		).unwrap();
		if (!entitlement) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		PERMIT: if (account) {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}

			const highestLevelRole = await Permissions.getHighestLevelRole(role, account, false).unwrap();
			if (!highestLevelRole) {
				return {
					success: false,
					message: 'You do not have permission to manage permissions on this role'
					// code: EventErrorCode.NoPermission,
				};
			}

			const rulesets = await Permissions.getRulesetsFromRole(highestLevelRole).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.targetAttribute === ruleset.data.targetAttribute
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

		await Permissions.revokeRoleRuleset(
			role,
			entitlement.data.name as Entitlement,
			ruleset.data.targetAttribute
		).unwrap();

		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	}
);

export const myAccountPermissions = query(async () => {
	const account = await getAccount();
	if (!account) {
		return error(401, 'Unauthorized');
	}

	if (!account) {
		throw new Error('No Authenticated account found');
	}

	const rs = await Permissions.getRulesetsFromAccount(account).unwrap();
	return rs.filter((r) => r.struct.name === 'account_rulesets') as Permissions.AccountRulesetData[];
});

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
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}

			const entitlement = await Permissions.Entitlement.get(
				{
					name: data.entitlement
				},
				{
					type: 'single'
				}
			).unwrap();
			if (!entitlement) {
				return {
					success: false,
					message: 'Entitlement not found'
				};
			}

			const accountToGrant = await Account.Account.fromId(data.account).unwrap();
			if (!accountToGrant) {
				return {
					success: false,
					message: 'Account not found'
				};
			}

			const rulesets = await Permissions.getRulesetsFromAccount(account).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.targetAttribute === data.targetAttribute
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

		Permissions.AccountRuleset.new({
			account: data.account,
			entitlement: data.entitlement,
			targetAttribute: data.targetAttribute,
			featureScopes: JSON.stringify(data.featureScopes)
		}).unwrap();

		return {
			success: true,
			message: 'Permission granted successfully'
		};
	}
);

export const revokeAccountPermission = command(
	z.object({
		ruleset: z.string()
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		const ruleset = await Permissions.AccountRuleset.fromId(data.ruleset).unwrap();
		if (!ruleset) {
			return {
				success: false,
				message: 'Ruleset not found'
			};
		}

		const entitlement = await Permissions.Entitlement.get(
			{
				name: ruleset.data.entitlement
			},
			{
				type: 'single'
			}
		).unwrap();
		if (!entitlement) {
			return {
				success: false,
				message: 'Entitlement not found'
			};
		}

		const accountToGrant = await Account.Account.fromId(ruleset.data.account).unwrap();
		if (!accountToGrant) {
			return {
				success: false,
				message: 'Account not found'
			};
		}

		PERMIT: if (account) {
			if (await Account.isAdmin(account)) {
				break PERMIT;
			}

			const rulesets = await Permissions.getRulesetsFromAccount(account).unwrap();
			if (
				!rulesets.some(
					(r) =>
						r.data.entitlement === entitlement.data.name &&
						r.data.targetAttribute === ruleset.data.targetAttribute
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

		if (!ruleset) {
			return {
				success: false,
				message: 'This account does not have this permission'
			};
		}

		await ruleset.delete().unwrap();
		return {
			success: true,
			message: 'Permission revoked successfully'
		};
	}
);
