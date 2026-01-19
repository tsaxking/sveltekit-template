import { query, command, getRequestEvent } from "$app/server";
import { Account } from "$lib/server/structs/account";
import z from "zod";
import { Struct } from "drizzle-struct/back-end";
import { Errors, EventSuccessCode } from "$lib/server/event-handler";
import { DataAction, PropertyAction } from "drizzle-struct/types";
import { Permissions } from "$lib/server/structs/permissions";
import { Logs } from "$lib/server/structs/log";

// Shared helpers for struct action integrations
const getStruct = (name: string) => {
    const struct = Struct.structs.get(name);
    if (!struct) return { error: Errors.noStruct(name) };
    return { struct };
};

const getStructAndAccount = (name: string) => {
    const event = getRequestEvent();
    const account = event.locals.account;
    const struct = Struct.structs.get(name);
    if (!struct) return { error: Errors.noStruct(name) };
    return { struct, account, event };
};

const getStructDataById = async (struct: Struct, id: string) => {
    const data = await struct.fromId(id);
    if (data.isErr()) return { error: Errors.internalError(data.error) };
    if (!data.value) return { error: Errors.noData(id) };
    return { data: data.value };
};

const checkBlocks = async (blocks: any, event: any, body: any, structName: string, action: any, reason: string) => {
    if (blocks) {
        for (const block of blocks) {
            const blocked = await block.fn(event, body);
            if (blocked) {
                return Errors.blocked(structName, action, block.reason);
            }
        }
    }
    return null;
};

const getAccount = () => {
    return getRequestEvent().locals.account;
};

const isAdmin = () => {
    const a = getAccount();
    if (!a) return false;
    return Account.isAdmin(a).unwrap();
}

export const create = command(z.object({
    struct: z.string(),
    data: z.record(z.unknown()),
    attributes: z.array(z.string()),
}), async (data) => {
    const event = getRequestEvent();
    const account = getAccount();
    const struct = Struct.structs.get(data.struct);
    if (!struct) return Errors.noStruct(data.struct);

    PERMIT: if (account && data.struct !== 'test') {
        if (await isAdmin()) {
            // Admins can always archive data
            break PERMIT;
        }

        {
            const blocks = struct.blocks.get(DataAction.Create);
            if (blocks) {
                for (const block of blocks) {
                    // Yes, await in a loop, but generally there should be only one or two blocks per action.
                    const blocked = await block.fn(event, data);
                    if (blocked) {
                        return Errors.blocked(struct.name, DataAction.Create, block.reason);
                    }
                }
            }
        }
        if (
            struct.bypasses.some(
                (b) => b.action === DataAction.Create && b.condition(account, data)
            )
        ) {
            break PERMIT;
        }

        const canDo = await Permissions.canCreate(account, struct, data.attributes);

        if (canDo.isErr()) {
            return Errors.internalError(canDo.error);
        }
    }

    const validateRes = struct.validate(data.data, {
        optionals: [
            'id',
            'created',
            'updated',
            'archived',
            'universe',
            'attributes',
            'lifetime',
            'canUpdate',
            'hash'
        ]
    });

    if (!validateRes.success) {
        return {
            success: false,
            message: 'Invalid data',
            errors: validateRes.reason,
        }
    }

    
	const res = await struct.new({
		...data.data,
		attributes: JSON.stringify(data.attributes)
	});

    if (res.isErr()) {
        return Errors.internalError(res.error);
    }

    Logs.log({
        struct: struct.name,
        dataId: res.value.id,
        accountId: event.locals.account?.id || 'unknown',
        type: 'create',
        message: `${event.locals.account?.data.username || 'unknown'} created data with id ${res.value.id}`
    });

    return {
        success: true,
        message: 'Data created successfully',
        code: EventSuccessCode.OK
    }
});

export const archive = command(z.object({ struct: z.any(), id: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    PERMIT: if (account && struct.name !== 'test') {
        if (await Account.isAdmin(account)) break PERMIT;
        const blockErr = await checkBlocks(struct.blocks.get(DataAction.Archive), event, data, struct.name, DataAction.Archive, 'archive');
        if (blockErr) return blockErr;
        if (struct.bypasses.some(b => b.action === DataAction.Archive && b.condition(account, structData.data))) break PERMIT;
        const canDo = await Permissions.accountCanDo(account, [structData], DataAction.Archive);
        if (canDo.isErr()) return Errors.internalError(canDo.error);
        if (!canDo.value[0]) return Errors.notPermitted(account, DataAction.Archive, struct.name);
    }

    const res = await structData.setArchive(true);
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'archive',
        message: `${account?.data.username || 'unknown'} archived data with id ${structData.id}`
    });

    return {
        success: true,
        message: 'Data archived successfully',
        code: EventSuccessCode.OK
    };
});

export const remove = command(z.object({ struct: z.any(), id: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    PERMIT: if (account && struct.name !== 'test') {
        if (await Account.isAdmin(account)) break PERMIT;
        const blockErr = await checkBlocks(struct.blocks.get(DataAction.Delete), event, data, struct.name, DataAction.Delete, 'delete');
        if (blockErr) return blockErr;
        if (struct.bypasses.some(b => b.action === DataAction.Delete && b.condition(account, structData.data))) break PERMIT;
        const canDo = await Permissions.accountCanDo(account, [structData], DataAction.Delete);
        if (canDo.isErr()) return Errors.internalError(canDo.error);
        if (!canDo.value[0]) return Errors.notPermitted(account, DataAction.Delete, struct.name);
    }

    const res = await structData.delete();
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'delete',
        message: `${account?.data.username || 'unknown'} deleted data with id ${structData.id}`
    });

    return {
        success: true,
        message: 'Data deleted successfully',
        code: EventSuccessCode.OK
    };
});

export const clear = command(z.object({ struct: z.any() }), async (data) => {
    const { struct, account } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!account) return Errors.noAccount();
    if (!(await Account.isAdmin(account).unwrap())) {
        return Errors.notPermitted(account, DataAction.Clear, struct.name);
    }
    await struct.clear().unwrap();
    return {
        success: true,
        code: EventSuccessCode.OK
    };
});

export const deleteVersion = command(z.object({ struct: z.any(), id: z.string(), vhId: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    const versions = await structData.getVersions();
    if (versions.isErr()) return Errors.internalError(versions.error);
    const version = versions.value.find((v) => v.vhId === data.vhId);
    if (!version) return Errors.noVersion(data.vhId);

    PERMIT: if (account && struct.name !== 'test') {
        if (await Account.isAdmin(account)) break PERMIT;
        const blockErr = await checkBlocks(struct.blocks.get(DataAction.DeleteVersion), event, data, struct.name, DataAction.DeleteVersion, 'delete-version');
        if (blockErr) return blockErr;
        if (struct.bypasses.some(b => b.action === DataAction.DeleteVersion && b.condition(account, structData.data))) break PERMIT;
        // Add permission check if needed
    }

    const res = await version.delete();
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'delete-version',
        message: `${account?.data.username || 'unknown'} deleted version ${data.vhId} for data id ${structData.id}`
    });

    return {
        success: true,
        message: 'Version deleted successfully',
        code: EventSuccessCode.OK
    };
});

export const readArchive = query(z.object({ struct: z.any() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const archiveData = await struct.archived({ type: 'all' });
    if (archiveData.isErr()) return Errors.internalError(archiveData.error);

    let payload: Record<string, unknown>[] = [];
    if (struct.data.name === 'test') {
        payload = archiveData.value.map((d) => d.data);
    } else {
        if (!account) return Errors.noAccount();
        const blockErr = await checkBlocks(struct.blocks.get('ReadArchive'), event, undefined, struct.name, 'ReadArchive', 'read-archive');
        if (blockErr) return blockErr;
        const res = await Permissions.filterPropertyActionFromAccount(account, archiveData.value, PropertyAction.ReadArchive);
        if (res.isErr()) return Errors.internalError(res.error);
        payload = res.value;
    }
    return {
        success: true,
        data: payload
    };
});

export const get = query(z.object({}), async (data) => {});

export const fromId = query(z.object({}), async (data) => {});

export const fromProperty = query(z.object({}), async (data) => {});

export const all = query(z.object({}), async (data) => {});

export const search = query(z.object({}), async (data) => {});

export const restoreArchive = command(z.object({ struct: z.any(), id: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    PERMIT: if (account && struct.name !== 'test') {
        if (await Account.isAdmin(account)) break PERMIT;
        const blockErr = await checkBlocks(struct.blocks.get(DataAction.RestoreArchive), event, data, struct.name, DataAction.RestoreArchive, 'restore-archive');
        if (blockErr) return blockErr;
        if (struct.bypasses.some(b => b.action === DataAction.RestoreArchive && b.condition(account, structData.data))) break PERMIT;
        // Add permission check if needed
    }

    const res = await structData.setArchive(false);
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'restore-archive',
        message: `${account?.data.username || 'unknown'} restored archive for data id ${structData.id}`
    });

    return {
        success: true,
        message: 'Archive restored successfully',
        code: EventSuccessCode.OK
    };
});

export const update = command(z.object({ struct: z.any(), id: z.string(), data: z.record(z.unknown()) }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    // Remove sensitive fields
    const updateData = { ...data.data };
    for (const key of ['id', 'created', 'updated', 'archived', 'attributes', 'lifetime', 'canUpdate', 'universe', ...(struct.data.safes || [])]) {
        delete updateData[key];
    }

    // Optionally, add permission and block checks here as needed

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await structData.update(updateData as any);
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'update',
        message: `${account?.data.username || 'unknown'} updated data with id ${structData.id}`
    });

    return {
        success: true,
        message: 'Data updated successfully',
        code: EventSuccessCode.OK
    };
});

export const ReadVersionHistory = query(z.object({ struct: z.any(), id: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    const versions = await structData.getVersions();
    if (versions.isErr()) return Errors.internalError(versions.error);

    let payload: Record<string, unknown>[] = [];
    if (struct.data.name === 'test') {
        payload = versions.value.map((d) => d.data);
    } else {
        if (!account) return Errors.noAccount();
        const blockErr = await checkBlocks(struct.blocks.get('ReadVersionHistory'), event, undefined, struct.name, 'ReadVersionHistory', 'read-version-history');
        if (blockErr) return blockErr;
        const res = await Permissions.filterPropertyActionFromAccount(account, versions.value, PropertyAction.ReadVersionHistory);
        if (res.isErr()) return Errors.internalError(res.error);
        payload = res.value;
    }
    return {
        success: true,
        data: payload
    };
});

export const restoreVersion = command(z.object({ struct: z.string(), id: z.string(), vhId: z.string() }), async (data) => {
    const { struct, account, event } = getStructAndAccount(data.struct);
    if (!struct) return Errors.noStruct(data.struct);
    if (!struct.frontend) return Errors.noFrontend(struct.name);
    if (struct.name !== 'test' && !account) return Errors.noAccount();

    const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
    if (dataError) return dataError;

    const versions = await structData.getVersions();
    if (versions.isErr()) return Errors.internalError(versions.error);
    const version = versions.value.find((v) => v.vhId === data.vhId);
    if (!version) return Errors.noVersion(data.vhId);

    PERMIT: if (account && struct.name !== 'test') {
        if (await Account.isAdmin(account)) break PERMIT;
        const blockErr = await checkBlocks(struct.blocks.get(DataAction.RestoreVersion), event, data, struct.name, DataAction.RestoreVersion, 'restore-version');
        if (blockErr) return blockErr;
        if (struct.bypasses.some(b => b.action === DataAction.RestoreVersion && b.condition(account, structData.data))) break PERMIT;
        // Add permission check if needed
    }

    const res = await version.restore();
    if (res.isErr()) return Errors.internalError(res.error);

    Logs.log({
        struct: struct.name,
        dataId: String(structData.id),
        accountId: account?.id || 'unknown',
        type: 'restore-version',
        message: `${account?.data.username || 'unknown'} restored version ${data.vhId} for data id ${structData.id}`
    });

    return {
        success: true,
        message: 'Version restored successfully',
        code: EventSuccessCode.OK
    };
});

// export const setAttributes = command(z.object({ struct: z.any(), id: z.string(), attributes: z.array(z.string()) }), async (data) => {
//     const { struct, account } = getStructAndAccount(data.struct);
//     if (!struct) return Errors.noStruct(data.struct?.name || 'unknown');
//     if (!account) return Errors.noAccount();
//     if (!(await Account.isAdmin(account).unwrap())) {
//         return Errors.notPermitted(account, DataAction., struct.name);
//     }
//     const { data: structData, error: dataError } = await getStructDataById(struct, data.id);
//     if (dataError) return dataError;
//     const res = await structData.setAttributes(data.attributes);
//     if (res.isErr()) return Errors.internalError(res.error);
//     return {
//         success: true,
//         message: 'Attributes set successfully',
//         code: EventSuccessCode.OK
//     };
// });