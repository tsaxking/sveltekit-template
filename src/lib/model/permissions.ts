import { type Writable, writable } from 'svelte/store';
import { attempt, attemptAsync } from 'ts-utils/check';
// import { Requests } from '../utils/requests';
import { Account } from './account';
import { Struct, StructData, DataArr } from 'drizzle-struct/front-end';
import { type Blank } from 'drizzle-struct/front-end';
import { sse } from '$lib/utils/sse';
import type { DataAction, PropertyAction } from 'drizzle-struct/types';
import { browser } from '$app/environment';
import { Requests } from '$lib/utils/requests';
import { z } from 'zod';

export namespace Permissions {
	export const Role = new Struct({
		name: 'role',
		socket: sse,
		structure: {
			name: 'string',
			// universe: 'string',
			entitlements: 'string', // string[]
			description: 'string',
			links: 'string' // used on the front end to show/hide links (csv)
		},
		browser
		// log: true,
	});

	if (browser) Object.assign(window, { Role });

	export type RoleData = StructData<typeof Role.data.structure>;
	export type RoleArr = DataArr<typeof Role.data.structure>[];

	export const getEntitlements = () => {
		return Requests.get<
			{
				name: string;
				structs: string[];
				group: string;
			}[]
		>('/struct/entitlements', {
			expectStream: false,
			cache: true,
			parser: z.array(
				z.object({
					name: z.string(),
					structs: z.array(z.string()),
					group: z.string()
				})
			)
		});
	};

	export const saveEntitlements = async (role: RoleData, permissions: string[]) => {
		return Role.call('update-entitlements', {
			role: role.data.id,
			permissions
		});
	};

	export const usersFromRole = (role: RoleData) => {
		return Account.Account.query(
			'role-members',
			{
				role: role.data.id
			},
			{
				asStream: false,
				satisfies: (_) => false
			}
		);
	};

	export const revokeRole = (roleId: string, accountId: string) => {
		return Role.call('revoke-role', {
			roleId,
			accountId
		});
	};

	export const grantRole = (roleId: string, accountId: string) => {
		return Role.call('grant-role', {
			roleId,
			accountId
		});
	};
}
