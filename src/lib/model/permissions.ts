/**
 * @fileoverview Permissions models and client helpers for roles, rulesets, and entitlements.
 *
 * @example
 * import { Permissions } from '$lib/model/permissions';
 * const roles = Permissions.searchRoles('admin', { offset: 0, limit: 25 });
 */
import { Account } from './account';
import { Struct, StructData, DataArr } from '$lib/services/struct/index';
import { sse } from '$lib/services/sse';
import { browser } from '$app/environment';
import { attemptAsync, attempt } from 'ts-utils/check';
import { Form } from '$lib/utils/form';
import * as remote from '$lib/remotes/permissions.remote';

/**
 * Permissions client helpers.
 *
 * Provides typed Struct wrappers plus convenience methods for common
 * permission operations such as role search and ruleset assignment.
 */
export namespace Permissions {
	/**
	 * Struct for roles.
	 *
	 * @property {string} name - Role name.
	 * @property {string} description - Role description.
	 * @property {string} parent - Parent role id.
	 * @property {string} color - Role color.
	 */
	export const Role = new Struct({
		name: 'role',
		structure: {
			/** Role name. */
			name: 'string',
			/** Role description. */
			description: 'string',
			/** Parent role id. */
			parent: 'string',
			/** Role color. */
			color: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for roles. */
	export type RoleData = StructData<typeof Role.data.structure>;
	/** Writable array of role records. */
	export type RoleDataArr = DataArr<typeof Role.data.structure>;

	/**
	 * Struct mapping roles to accounts.
	 *
	 * @property {string} role - Role id.
	 * @property {string} account - Account id.
	 */
	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			/** Role id. */
			role: 'string',
			/** Account id. */
			account: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for role-account bindings. */
	export type RoleAccountData = StructData<typeof RoleAccount.data.structure>;
	/** Writable array of role-account bindings. */
	export type RoleAccountDataArr = DataArr<typeof RoleAccount.data.structure>;

	/**
	 * Struct for entitlements.
	 *
	 * @property {string} name - Entitlement name.
	 * @property {string} description - Description.
	 * @property {string} structs - Serialized struct list.
	 * @property {string} permissions - Serialized permissions.
	 * @property {string} group - Entitlement group name.
	 * @property {string} defaultFeatureScopes - Default scopes.
	 * @property {string} features - Serialized features.
	 */
	export const Entitlement = new Struct({
		name: 'entitlements',
		structure: {
			/** Entitlement name. */
			name: 'string',
			/** Description. */
			description: 'string',
			/** Serialized struct list. */
			structs: 'string',
			/** Serialized permissions. */
			permissions: 'string',
			/** Entitlement group name. */
			group: 'string',
			/** Default scopes. */
			defaultFeatureScopes: 'string',
			/** Serialized features. */
			features: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for entitlements. */
	export type EntitlementData = StructData<typeof Entitlement.data.structure>;
	/** Writable array of entitlements. */
	export type EntitlementDataArr = DataArr<typeof Entitlement.data.structure>;

	/**
	 * Struct for role rulesets.
	 *
	 * @property {string} role - Role id.
	 * @property {string} entitlement - Entitlement id.
	 * @property {string} targetAttribute - Attribute id.
	 * @property {string} parent - Parent ruleset id.
	 * @property {string} name - Ruleset name.
	 * @property {string} description - Ruleset description.
	 * @property {string} featureScopes - Serialized feature scopes.
	 */
	export const RoleRuleset = new Struct({
		name: 'role_rulesets',
		structure: {
			/** Role id. */
			role: 'string',
			/** Entitlement id. */
			entitlement: 'string',
			/** Attribute id. */
			targetAttribute: 'string',
			/** Parent ruleset id. */
			parent: 'string',
			/** Ruleset name. */
			name: 'string',
			/** Ruleset description. */
			description: 'string',
			/** Serialized feature scopes. */
			featureScopes: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for role rulesets. */
	export type RoleRulesetData = StructData<typeof RoleRuleset.data.structure>;
	/** Writable array of role rulesets. */
	export type RoleRulesetDataArr = DataArr<typeof RoleRuleset.data.structure>;

	/**
	 * Struct for account rulesets.
	 *
	 * @property {string} account - Account id.
	 * @property {string} entitlement - Entitlement id.
	 * @property {string} targetAttribute - Attribute id.
	 * @property {string} featureScopes - Serialized feature scopes.
	 */
	export const AccountRuleset = new Struct({
		name: 'account_rulesets',
		structure: {
			/** Account id. */
			account: 'string',
			/** Entitlement id. */
			entitlement: 'string',
			/** Attribute id. */
			targetAttribute: 'string',
			/** Serialized feature scopes. */
			featureScopes: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for account rulesets. */
	export type AccountRulesetData = StructData<typeof AccountRuleset.data.structure>;
	/** Writable array of account rulesets. */
	export type AccountRulesetDataArr = DataArr<typeof AccountRuleset.data.structure>;

	/**
	 * Fetches permissions for a role.
	 *
	 * @param {RoleData} role - Role struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * const perms = await Permissions.getRolePermissions(role).unwrap();
	 */
	export const getRolePermissions = (role: RoleData) => {
		return attemptAsync(async () => {
			if (!role.data.id) throw new Error('Role must have an ID');
			return remote.permissionsFromRole({
				role: role.data.id
			});
		});
	};
	/**
	 * Fetches available permissions for a role.
	 *
	 * @param {RoleData} role - Role struct data.
	 * @returns {DataArr<typeof RoleRuleset.data.structure>} Writable ruleset array.
	 *
	 * @example
	 * const rulesets = Permissions.getAvailableRolePermissions(role);
	 */
	export const getAvailableRolePermissions = (role: RoleData) => {
		return attempt(() => {
			if (!role.data.id) throw new Error('Role must have an ID');
			const w = RoleRuleset.arr();
			remote
				.availablePermissions({
					role: role.data.id
				})
				.then((res) => {
					w.set(res.map((d) => RoleRuleset.Generator(d)));
				})
				.catch(console.error);
			return w;
		});
	};

	/**
	 * Returns all entitlements.
	 *
	 * @returns {DataArr<typeof Entitlement.data.structure>} Writable entitlements array.
	 *
	 * @example
	 * const entitlements = Permissions.getEntitlements();
	 */
	export const getEntitlements = () => {
		return Entitlement.all({
			type: 'all'
		});
	};

	/**
	 * Collects entitlement group names.
	 *
	 * @returns {import('ts-utils/check').ResultPromise<string[]>} Distinct group names.
	 *
	 * @example
	 * const groups = await Permissions.getEntitlementGroups().unwrap();
	 */
	export const getEntitlementGroups = () => {
		return attemptAsync(async () => {
			const groups = new Set<string>();
			const entitlements = getEntitlements();
			const fn = (e: EntitlementData) => {
				if (e.data.group) groups.add(e.data.group);
			};
			if (entitlements.length) entitlements.each(fn);
			else {
				const res = await entitlements.await().unwrap();
				for (const e of res) fn(e);
			}
			return Array.from(groups);
		});
	};

	/**
	 * Grants a ruleset to a role.
	 *
	 * @param {RoleData} role - Role struct data.
	 * @param {RoleRulesetData} ruleset - Ruleset struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.grantRuleset(role, ruleset).unwrap();
	 */
	export const grantRuleset = (role: RoleData, ruleset: RoleRulesetData) => {
		return attemptAsync(async () => {
			if (!role.data.id) throw new Error('Role must have an ID');
			if (!ruleset.data.id) throw new Error('Ruleset must have an ID');
			return remote.grantRolePermission({
				role: role.data.id,
				ruleset: ruleset.data.id
			});
		});
	};

	/**
	 * Revokes a ruleset from a role.
	 *
	 * @param {RoleRulesetData} ruleset - Ruleset struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.revokeRolePermission(ruleset).unwrap();
	 */
	export const revokeRolePermission = (ruleset: RoleRulesetData) => {
		return attemptAsync(async () => {
			if (!ruleset.data.id) throw new Error('Ruleset must have an ID');
			return remote.revokeRolePermission({
				ruleset: ruleset.data.id
			});
		});
	};

	/**
	 * Grants an entitlement to an account.
	 *
	 * @param {Account.AccountData} account - Target account.
	 * @param {EntitlementData} entitlement - Entitlement struct data.
	 * @param {string} targetAttribute - Target attribute for ruleset scope.
	 * @param {string[]} [featureScopes] - Optional feature scopes.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.grantAccountPermission(account, entitlement, 'role', ['all']).unwrap();
	 */
	export const grantAccountPermission = (
		account: Account.AccountData,
		entitlement: EntitlementData,
		targetAttribute: string,
		featureScopes?: string[]
	) => {
		return attemptAsync(async () => {
			if (!account.data.id) throw new Error('Account must have an ID');
			if (!entitlement.data.id) throw new Error('Entitlement must have an ID');
			return remote.grantAccountPermission({
				account: account.data.id,
				entitlement: entitlement.data.id,
				targetAttribute,
				featureScopes: featureScopes ? featureScopes : []
			});
		});
	};

	/**
	 * Revokes an account ruleset.
	 *
	 * @param {AccountRulesetData} ruleset - Account ruleset struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.revokeAccountPermission(ruleset).unwrap();
	 */
	export const revokeAccountPermission = (ruleset: AccountRulesetData) => {
		return attemptAsync(async () => {
			if (!ruleset.data.id) throw new Error('Ruleset must have an ID');
			return remote.revokeAccountPermission({
				ruleset: ruleset.data.id
			});
		});
	};

	/**
	 * Searches roles by name.
	 *
	 * @param {string} searchKey - Search string.
	 * @param {{ offset: number; limit: number }} config - Pagination config.
	 * @returns {DataArr<typeof Role.data.structure>} Writable role array.
	 *
	 * @example
	 * const roles = Permissions.searchRoles('admin', { offset: 0, limit: 25 });
	 */
	export const searchRoles = (
		searchKey: string,
		config: {
			offset: number;
			limit: number;
		}
	) => {
		const w = Role.arr();
		remote
			.searchRoles({
				searchKey,
				limit: config.limit,
				page: Math.floor(config.offset / config.limit)
			})
			.then((res) => {
				w.set(res.map((d) => Role.Generator(d)));
			});
		return w;
	};

	/**
	 * Creates a role under a parent.
	 *
	 * @param {RoleData} parent - Parent role.
	 * @param {{ name: string; description: string; color: string }} config - Role config.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.createRole(parent, { name: 'Editor', description: 'Can edit', color: '#333' }).unwrap();
	 */
	export const createRole = (
		parent: RoleData,
		config: { name: string; description: string; color: string }
	) => {
		return attemptAsync(async () => {
			if (!parent.data.id) throw new Error('Parent role must have an ID');
			return remote.createRole({
				name: config.name,
				description: config.description,
				color: config.color,
				parent: parent.data.id
			});
		});
	};

	/**
	 * Opens a UI prompt to create a child role.
	 *
	 * @param {RoleData} parent - Parent role.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.createChildRolePopup(parent).unwrap();
	 */
	export const createChildRolePopup = async (parent: RoleData) => {
		return attemptAsync(async () => {
			const res = await new Form()
				.input('name', {
					label: 'Role Name',
					placeholder: 'Enter role name',
					required: true,
					type: 'text'
				})
				.input('description', {
					label: 'Description',
					placeholder: 'Enter role description',
					required: true,
					type: 'text',
					value: ''
				})
				.prompt({
					send: false,
					title: `Create Child Role for ${parent.data.name}`
				})
				.unwrap();

			if (!res.value.name || !res.value.description)
				throw new Error('Name and description are required');

			return createRole(parent, {
				name: res.value.name,
				description: res.value.description,
				color: '#000000'
			}).unwrap();
		});
	};

	/**
	 * Adds an account to a role.
	 *
	 * @param {RoleData} role - Role struct data.
	 * @param {Account.AccountData} account - Account struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.addToRole(role, account).unwrap();
	 */
	export const addToRole = (role: RoleData, account: Account.AccountData) => {
		return attemptAsync(async () => {
			if (!role.data.id) throw new Error('Role must have an ID');
			if (!account.data.id) throw new Error('Account must have an ID');
			return remote.addToRole({
				role: role.data.id,
				account: account.data.id
			});
		});
	};

	/**
	 * Removes an account from a role.
	 *
	 * @param {RoleData} role - Role struct data.
	 * @param {Account.AccountData} account - Account struct data.
	 * @returns {import('ts-utils/check').ResultPromise<unknown>} Remote result.
	 *
	 * @example
	 * await Permissions.removeFromRole(role, account).unwrap();
	 */
	export const removeFromRole = (role: RoleData, account: Account.AccountData) => {
		return attemptAsync(async () => {
			if (!role.data.id) throw new Error('Role must have an ID');
			if (!account.data.id) throw new Error('Account must have an ID');
			return remote.removeFromRole({
				role: role.data.id,
				account: account.data.id
			});
		});
	};
}
