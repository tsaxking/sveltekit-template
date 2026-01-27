import { Account } from './account';
import { Struct, StructData, DataArr } from '$lib/services/struct/index';
import { sse } from '$lib/services/sse';
import { browser } from '$app/environment';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';
import { Form } from '$lib/utils/form';

export namespace Permissions {
	export const Role = new Struct({
		name: 'role',
		structure: {
			name: 'string',
			description: 'string',
			parent: 'string',
			color: 'string'
		},
		socket: sse,
		browser
	});

	export type RoleData = StructData<typeof Role.data.structure>;
	export type RoleDataArr = DataArr<typeof Role.data.structure>;

	export const RoleAccount = new Struct({
		name: 'role_account',
		structure: {
			role: 'string',
			account: 'string'
		},
		socket: sse,
		browser
	});

	export type RoleAccountData = StructData<typeof RoleAccount.data.structure>;
	export type RoleAccountDataArr = DataArr<typeof RoleAccount.data.structure>;

	export const Entitlement = new Struct({
		name: 'entitlements',
		structure: {
			name: 'string',
			description: 'string',
			structs: 'string',
			permissions: 'string',
			group: 'string',
			defaultFeatureScopes: 'string',
			features: 'string'
		},
		socket: sse,
		browser
	});

	export type EntitlementData = StructData<typeof Entitlement.data.structure>;
	export type EntitlementDataArr = DataArr<typeof Entitlement.data.structure>;

	export const RoleRuleset = new Struct({
		name: 'role_rulesets',
		structure: {
			role: 'string',
			entitlement: 'string',
			targetAttribute: 'string',
			parent: 'string',
			name: 'string',
			description: 'string',
			featureScopes: 'string'
		},
		socket: sse,
		browser
	});

	export type RoleRulesetData = StructData<typeof RoleRuleset.data.structure>;
	export type RoleRulesetDataArr = DataArr<typeof RoleRuleset.data.structure>;

	export const AccountRuleset = new Struct({
		name: 'account_rulesets',
		structure: {
			account: 'string',
			entitlement: 'string',
			targetAttribute: 'string',
			featureScopes: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountRulesetData = StructData<typeof AccountRuleset.data.structure>;
	export type AccountRulesetDataArr = DataArr<typeof AccountRuleset.data.structure>;

	export const getRolePermissions = (role: RoleData) => {

	};
	export const getAvailableRolePermissions = (role: RoleData) => {

	};

	export const getEntitlements = () => {
		return Entitlement.all({
			type: 'all'
		});
	};

	export const getEntitlementGroups = () => {
		return attemptAsync(async () => {
			const groups = new Set<string>();
			await Entitlement.all({
				type: 'stream'
			}).pipe((e) => {
				if (e.data.group) groups.add(e.data.group);
			});
			return Array.from(groups);
		});
	};

	export const grantRuleset = (role: RoleData, ruleset: RoleRulesetData) => {

	};

	export const revokeRolePermission = (ruleset: RoleRulesetData) => {

	};

	export const grantAccountPermission = (
		account: Account.AccountData,
		entitlement: EntitlementData,
		targetAttribute: string,
		featureScopes?: string[]
	) => {

	};
	export const revokeAccountPermission = (ruleset: AccountRulesetData) => {

	};

	export const searchRoles = (
		searchKey: string,
		config: {
			offset: number;
			limit: number;
		}
	) => {

	};

	export const createRole = (
		parent: RoleData,
		config: { name: string; description: string; color: string }
	) => {

	};

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

	export const addToRole = (role: RoleData, account: Account.AccountData) => {

	};

	export const removeFromRole = (role: RoleData, account: Account.AccountData) => {

	};
}
