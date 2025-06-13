import { type Writable, writable, type Readable, readable } from 'svelte/store';
import { attempt, attemptAsync } from 'ts-utils/check';
// import { Requests } from '../utils/requests';
import { Account } from './account';
import { Struct, StructData, DataArr } from 'drizzle-struct/front-end';
import { type Blank } from 'drizzle-struct/front-end';
import { sse } from '$lib/services/sse';
import type { DataAction, PropertyAction } from 'drizzle-struct/types';
import { browser } from '$app/environment';
import { Requests } from '$lib/utils/requests';
import { z } from 'zod';

export namespace Permissions {
    export const Role = new Struct({
        name: 'role',
        structure: {
            name: 'string',
            description: 'string',
        },
        socket: sse,
        browser,
    });

	export type RoleData = StructData<typeof Role.data.structure>;
    export type RoleDataArr = DataArr<typeof Role.data.structure>;

    export const RoleAccount = new Struct({
        name: 'role_account',
        structure: {
            role: 'string',
            account: 'string',
        },
        socket: sse,
        browser,
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
        },
        socket: sse,
        browser,
    });

    export type EntitlementData = StructData<typeof Entitlement.data.structure>;
    export type EntitlementDataArr = DataArr<typeof Entitlement.data.structure>;

    export const RoleRuleset = new Struct({
        name: 'role_ruleset',
        structure: {
            role: 'string',
            entitlement: 'string',
            target: 'string',
        },
        socket: sse,
        browser,
    });

    export type RoleRulesetData = StructData<typeof RoleRuleset.data.structure>;
    export type RoleRulesetDataArr = DataArr<typeof RoleRuleset.data.structure>;

    export const AccountRuleset = new Struct({
        name: 'account_ruleset',
        structure: {
            account: 'string',
            entitlement: 'string',
            target: 'string',
        },
        socket: sse,
        browser,
    });

    export type AccountRulesetData = StructData<typeof AccountRuleset.data.structure>;
    export type AccountRulesetDataArr = DataArr<typeof AccountRuleset.data.structure>;

    export const getRolePermissions = (role: RoleData) => {
        return RoleRuleset.query('from-role', {
            role: role.data.id,
        }, {
            asStream: false,
            satisfies: (data) => data.data.role === role.data.id,
        });
    };

    export const getEntitlements = () => {
        return Entitlement.all(false);
    }
}
