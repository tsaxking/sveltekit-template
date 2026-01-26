import { command, query } from "$app/server";
import z from "zod";
import { getAccount } from "./index.remote";
import { error } from "@sveltejs/kit";
import { Permissions } from "$lib/server/structs/permissions";
import { PropertyAction } from "$lib/types/struct";
import { Account } from "$lib/server/structs/account";

export const searchRoles = query(z.object({
    searchKey: z.string().min(1).max(32),
    limit: z.number().min(1).max(100).default(10),
    page: z.number().min(0).default(0),
}), async (data) => {
    const account = await getAccount();
    if (!account) {
        return error(401, 'Unauthorized');
    }

    const roles = await Permissions.searchRoles(data.searchKey, {
        offset: data.page * data.limit,
        limit: data.limit
    });
    if (roles.isErr()) {
        return {
            success: false,
            message: 'Internal server error'
        };
    }

    const res = await Permissions.filterPropertyActionFromAccount(account, roles.value, PropertyAction.Read);

    if (res.isErr()) {
        return {
            success: false,
            message: 'Internal server error'
        };
    }

    return {
        success: true,
        data: {
            roles: res.value
        }
    };
});

export const createRole = command(z.object({
    name: z.string().min(3).max(32),
    description: z.string().min(0).max(255),
    parent: z.string(),
    color: z.string().refine((val) => /^#([0-9A-F]{3}){1,2}$/i.test(val), {
        message: 'Invalid color format'
    })
}), async (data) => {
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
            const highestRole = await Permissions.getHighestLevelRole(
                parentRole,
                account,
                true
            ).unwrap();
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

            if (
                [...upper, ...lower].some((r) => r.data.name.toLowerCase() === data.name.toLowerCase())
            ) {
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
});

export const addToRole = command(z.object({}), async (data) => {});

export const removeFromRole = command(z.object({}), async (data) => {});

export const myPermissions = query(async () => {});

export const permissionsFromRole = query(z.object({}), async (data) => {});

export const availablePermissions = query(z.object({}), async (data) => {});

export const grantRolePermission = query(z.object({}), async (data) => {});

export const revokeRolePermission = query(z.object({}), async (data) => {});

export const grantAccountPermission = query(z.object({}), async (data) => {});

export const revokeAccountPermission = query(z.object({}), async (data) => {});