import { Account } from './account';
import { Struct, StructData, DataArr } from '$lib/services/struct/index';
import { sse } from '$lib/services/sse';
import { browser } from '$app/environment';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';

export namespace Permissions {
	export const Role = new Struct({
		name: 'role',
		structure: {
			name: 'string',
			description: 'string',
			parent: 'string'
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
			group: 'string'
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
			reason: 'string'
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
			reason: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountRulesetData = StructData<typeof AccountRuleset.data.structure>;
	export type AccountRulesetDataArr = DataArr<typeof AccountRuleset.data.structure>;

	export const getRolePermissions = (role: RoleData) => {
		return RoleRuleset.query(
			'from-role',
			{
				role: role.data.id
			},
			{
				asStream: false,
				satisfies: (data) => data.data.role === role.data.id
			}
		);
	};
	export const getAvailableRolePermissions = (role: RoleData) => {
		return RoleRuleset.query(
			'available-permissions',
			{
				role: role.data.id
			},
			{
				asStream: false,
				satisfies: (data) => data.data.role === role.data.parent
			}
		);
	};

	export const getEntitlements = () => {
		return Entitlement.all(false);
	};

	export const getEntitlementGroups = () => {
		return attemptAsync(async () => {
			const groups = new Set<string>();
			await Entitlement.all(true).pipe((e) => {
				if (e.data.group) groups.add(e.data.group);
			});
			return Array.from(groups);
		});
	};

	export const grantRolePermission = (
		role: RoleData,
		entitlement: EntitlementData,
		targetAttribute: string
	) => {
		return RoleRuleset.call('grant-permission', {
			role: role.data.id,
			entitlement: entitlement.data.name,
			targetAttribute
		});
	};

	export const revokeRolePermission = (
		role: RoleData,
		entitlement: EntitlementData,
		targetAttribute: string
	) => {
		return RoleRuleset.call('revoke-permission', {
			role: role.data.id,
			entitlement: entitlement.data.name,
			targetAttribute
		});
	};

	export const grantAccountPermission = (
		account: Account.AccountData,
		entitlement: EntitlementData,
		targetAttribute: string
	) => {
		return AccountRuleset.call('grant-permission', {
			account: account.data.id,
			entitlement: entitlement.data.name,
			targetAttribute
		});
	};
	export const revokeAccountPermission = (
		account: Account.AccountData,
		entitlement: EntitlementData,
		targetAttribute: string
	) => {
		return AccountRuleset.call('revoke-permission', {
			account: account.data.id,
			entitlement: entitlement.data.name,
			targetAttribute
		});
	};

	export const searchRoles = (
		searchKey: string,
		config: {
			offset: number;
			limit: number;
		}
	) => {
		return attemptAsync(async () => {
			const res = await Role.send(
				'search',
				{
					searchKey,
					offset: config.offset,
					limit: config.limit
				},
				z.array(
					Role.getZodSchema({
						optionals: Object.keys(Role.data.structure)
					})
				)
			).unwrap();

			return res.map((r) => Role.Generator(r));
		});
	};
}
