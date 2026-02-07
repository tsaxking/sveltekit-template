/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Struct RPC endpoints for shared client/server access.
 *
 * Each `query()`/`command()` curries a handler with a Zod schema that validates
 * inputs at the boundary, enabling type-safe and permission-safe usage on both
 * client and server.
 *
 * All queries send the list of ids currently cached on the client to minimize
 * redundant data transfer.
 *
 * @example
 * import * as structRemote from '$lib/remotes/struct.remote';
 * await structRemote.create({ struct: 'account', data: { username: 'demo' }, attributes: [] });
 */
// all queries will send the list of ids it currently has cached to avoid redundant data transfer

import { DataAction, PropertyAction } from '$lib/types/struct';
import { command, query } from '$app/server';
import z from 'zod';
import structRegistry from '$lib/server/services/struct-registry';
import { error } from '@sveltejs/kit';
import terminal from '$lib/server/utils/terminal';
import { getAccount, isAdmin } from './index.remote';
import { Account } from '$lib/server/structs/account';
import { Permissions } from '$lib/server/structs/permissions';

/**
 * Creates a new struct record.
 *
 * @param {object} params - Create parameters.
 * @param {string} params.struct - Struct name.
 * @param {Record<string, unknown>} params.data - Payload data.
 * @param {string[]} params.attributes - Attribute list.
 */
export const create = command(
	z.object({
		struct: z.string(),
		data: z.record(z.unknown()),
		attributes: z.array(z.string())
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.Create, account);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`Create action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const isBypassed = registry.isBypassed(DataAction.Create, account);
			if (isBypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (isBypassed.value) {
				break PERMIT;
			}

			const canDo = await Permissions.canCreate(account, registry.struct, data.attributes);
			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (!canDo.value) {
				return error(403, 'Unauthorized');
			}
		}

		const validateRes = registry.struct.validate(data.data, {
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
			return error(400, 'Invalid data');
		}

		const res = await registry.struct.new({
			...data.data,
			attributes: JSON.stringify(data.attributes)
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
 * Validates the client-side structure for a struct.
 *
 * @param {object} params - Connection parameters.
 * @param {string} params.struct - Struct name.
 * @param {Record<string, string>} params.structure - Client structure map.
 */
export const connect = query(
	z.object({
		struct: z.string(),
		structure: z.record(z.string())
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return {
				success: false,
				message: 'Invalid data type'
			};
		}
		for (const [k, v] of Object.entries(registry.struct.data.structure)) {
			if (!data.structure[k]) {
				if (registry.struct.data.safes?.includes(k)) {
					// We don't want safes on the front end
					continue;
				}
				terminal.error(`Key ${k} is missing from the structure`);
				return {
					success: false,
					message: 'Invalid data type'
				};
			}
			if (registry.struct.data.safes?.includes(k) && data.structure[k]) {
				terminal.error(`Key ${k} is a safe and should not be included in the structure`);
				return {
					success: false,
					message: 'Invalid data type'
				};
			}
			if (data.structure[k] !== (v as any).config.dataType) {
				terminal.error(
					`Key ${k} has an invalid data type, expected ${(v as any).config.dataType}, got ${data.structure[k]}`
				);
				return {
					success: false,
					message: 'Invalid data type'
				};
			}
		}

		return { success: true, message: 'Structure is valid' };
	}
);

/**
 * Updates a struct record by id.
 *
 * @param {object} params - Update parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 * @param {Record<string, unknown>} params.data - Partial update data.
 */
export const update = command(
	z.object({
		struct: z.string(),
		id: z.string(),
		data: z.record(z.unknown())
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const targetData = await registry.struct.fromId(data.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${data.id} not found`);
		}

		// Delete sensitive data that should not be updated by users:
		{
			delete (data.data as any).id;
			delete (data.data as any).created;
			delete (data.data as any).updated;
			delete (data.data as any).archived;
			delete (data.data as any).attributes;
			delete (data.data as any).lifetime;
			delete (data.data as any).canUpdate;
			delete (data.data as any).universe;
			delete (data.data as any).hash;

			for (const key of registry.struct.data.safes || []) {
				delete (data.data as any)[key];
			}

			if (registry.struct.data.safes !== undefined) {
				for (const key of Object.keys(data.data as object)) {
					if (registry.struct.data.safes.includes(key)) {
						// user may not update safes
						delete (data.data as any)[key];
					}
				}
			}
		}

		if (Object.keys(data.data).length === 0) {
			return error(400, 'No data to update');
		}

		if (data.struct === 'test') {
			const res = await targetData.value.update(data.data as any);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			return { success: true };
		}

		const account = await getAccount();

		if (!account) {
			return error(403, 'Unauthorized');
		}

		BLOCKS: {
			const blocked = registry.isBlocked(PropertyAction.Update, account, targetData.value);
			if (blocked.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (blocked.value) {
				terminal.error(`Update action is blocked for struct ${data.struct}`);
				return error(403, 'Unauthorized');
			}
			if (await isAdmin()) break BLOCKS;
		}

		const filtered = await Permissions.filterPropertyActionFromAccount(
			account,
			[targetData.value],
			PropertyAction.Update
		);
		if (filtered.isErr()) {
			return error(500, 'Internal Server Error');
		}

		const [canUpdate] = filtered.value;
		if (!canUpdate || Object.keys(canUpdate).length === 0) {
			return error(403, 'Unauthorized');
		}

		const toUpdate: Record<string, unknown> = {};
		for (const key in canUpdate) {
			if (Object.prototype.hasOwnProperty.call(data.data, key)) {
				(toUpdate as any)[key] = (data.data as any)[key];
			}
		}

		if (Date.now() < targetData.value.updated.getTime()) {
			terminal.error(`Data with id ${data.id} has a newer updated timestamp than the server time`);
		}

		const res = await targetData.value.update(toUpdate as any);
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

/**
 * Archives a struct record by id.
 *
 * @param {object} params - Archive parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 */
export const archive = command(
	z.object({
		struct: z.string(),
		id: z.string()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const targetData = await registry.struct.fromId(data.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.Archive, account, targetData.value);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`Archive action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const bypassed = registry.isBypassed(DataAction.Archive, account, targetData.value);
			if (bypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (bypassed.value) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(account, [targetData.value], DataAction.Archive);
			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canDo.value[0]) {
				return error(403, 'Unauthorized');
			}
		}

		const res = await targetData.value.setArchive(true);

		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}

		return { success: true };
	}
);

/**
 * Restores an archived struct record.
 *
 * @param {object} params - Restore parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 */
export const restoreArchive = command(
	z.object({
		struct: z.string(),
		id: z.string()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const targetData = await registry.struct.fromId(data.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.RestoreArchive, account, targetData.value);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`RestoreArchive action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const bypassed = registry.isBypassed(DataAction.RestoreArchive, account, targetData.value);
			if (bypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (bypassed.value) {
				// Bypass permissions
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData.value],
				DataAction.RestoreArchive
			);
			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canDo.value[0]) {
				return error(403, 'Unauthorized');
			}
		}

		const res = await targetData.value.setArchive(false);
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

/**
 * Clears all data from a struct.
 *
 * @param {object} params - Clear parameters.
 * @param {string} params.struct - Struct name.
 */
export const clear = command(
	z.object({
		struct: z.string()
	}),
	async (data) => {
		if (!(await isAdmin())) {
			return error(403, 'Unauthorized');
		}

		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const res = await registry.struct.clear();
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

/**
 * Restores a record to a version history entry.
 *
 * @param {object} params - Restore parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.vhId - Version history id.
 */
export const restoreVersion = command(
	z.object({
		struct: z.string(),
		vhId: z.string()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const version = await registry.struct.fromVhId(data.vhId);
		if (version.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!version.value) {
			return error(404, `Version with vhId ${data.vhId} not found`);
		}

		const targetData = await registry.struct.fromId(version.value.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${version.value.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.RestoreVersion, account, targetData.value);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`RestoreVersion action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const bypassed = registry.isBypassed(DataAction.RestoreVersion, account, targetData.value);
			if (bypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (bypassed.value) {
				// Bypass permissions
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData.value],
				DataAction.RestoreVersion
			);

			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canDo.value[0]) {
				return error(403, 'Unauthorized');
			}
		}

		const res = await version.value.restore();
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

/**
 * Permanently deletes a record.
 *
 * @param {object} params - Delete parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 */
export const remove = command(
	z.object({
		struct: z.string(),
		id: z.string()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const targetData = await registry.struct.fromId(data.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.Delete, account, targetData.value);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`Delete action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const bypassed = registry.isBypassed(DataAction.Delete, account, targetData.value);
			if (bypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (bypassed.value) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(account, [targetData.value], DataAction.Delete);
			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canDo.value[0]) {
				return error(403, 'Unauthorized');
			}
		}

		const res = await targetData.value.delete();
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

/**
 * Permanently deletes a version history entry.
 *
 * @param {object} params - Delete parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.vhId - Version history id.
 */
export const removeVersion = command(
	z.object({
		struct: z.string(),
		vhId: z.string()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const version = await registry.struct.fromVhId(data.vhId);
		if (version.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!version.value) {
			return error(404, `Version with vhId ${data.vhId} not found`);
		}

		const targetData = await registry.struct.fromId(version.value.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${version.value.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (data.struct !== 'test') {
			if (!account) {
				return error(403, 'Unauthorized');
			}

			{
				const blocked = registry.isBlocked(DataAction.DeleteVersion, account, targetData.value);
				if (blocked.isErr()) {
					return error(500, 'Internal Server Error');
				}
				if (blocked.value) {
					terminal.error(`DeleteVersion action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}

			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			const bypassed = registry.isBypassed(DataAction.DeleteVersion, account, targetData.value);
			if (bypassed.isErr()) {
				return error(500, 'Internal Server Error');
			}
			if (bypassed.value) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData.value],
				DataAction.DeleteVersion
			);
			if (canDo.isErr()) {
				return error(500, 'Internal Server Error');
			}

			if (!canDo.value[0]) {
				return error(403, 'Unauthorized');
			}
		}

		const res = await version.value.delete();
		if (res.isErr()) {
			return error(500, 'Internal Server Error');
		}
		return { success: true };
	}
);

const filterKeys = (keys: string[]) => (item: Record<string, unknown>) => {
	const filtered: Record<string, unknown> = {};
	for (const key of keys) {
		if (key in item) {
			filtered[key] = item[key];
		}
	}
	return filtered;
};

/**
 * Returns records based on query type and pagination.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.type - Query type (all/array/single/count/stream).
 * @param {number} [params.limit] - Max results.
 * @param {number} [params.offset] - Offset for pagination.
 * @param {string[]} [params.ids] - Cached ids on the client.
 */
export const all = query(
	z.object({
		struct: z.string(),
		cached: z.array(z.string()),
		keys: z.array(z.string()),
		pagination: z
			.object({
				page: z.number().min(1),
				limit: z.number().min(1).max(100)
			})
			.optional()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const retrieved = await registry.struct.all({
			type: 'all'
		});

		if (retrieved.isErr()) {
			return error(500, 'Internal Server Error');
		}

		let value = retrieved.value;

		if (data.pagination) {
			value = value.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = value.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			payload = res.value;
		}
		if (data.keys.length > 0) {
			payload = payload.map(filterKeys(data.keys));
		}
		return {
			items: payload,
			total: 0
		};
	}
);

/**
 * Returns records matching a property filter.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {Record<string, unknown>} params.filter - Property filter.
 * @param {string} params.type - Query type.
 * @param {number} [params.limit] - Max results.
 * @param {number} [params.offset] - Offset for pagination.
 * @param {string[]} [params.ids] - Cached ids on the client.
 */
export const get = query(
	z.object({
		struct: z.string(),
		data: z.record(z.unknown()),
		cached: z.array(z.string()),
		keys: z.array(z.string()),
		pagination: z
			.object({
				page: z.number().min(1),
				limit: z.number().min(1).max(100)
			})
			.optional()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const retrieved = await registry.struct.get(data.data as any, {
			type: 'all'
		});
		if (retrieved.isErr()) {
			return error(500, 'Internal Server Error');
		}
		let value = retrieved.value;
		if (data.pagination) {
			value = value.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = value.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			payload = res.value;
		}
		if (data.keys.length > 0) {
			payload = payload.map(filterKeys(data.keys));
		}
		return {
			items: payload,
			total: 0
		};
	}
);

/**
 * Returns a record by id.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 */
export const fromId = query(
	z.object({
		struct: z.string(),
		id: z.string(),
		keys: z.array(z.string())
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}
		const account = await getAccount();

		const retrieved = await registry.struct.fromId(data.id);
		if (retrieved.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!retrieved.value) {
			return error(404, `Data not found`);
		}

		if (data.struct === 'test') {
			return retrieved.value.data;
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				[retrieved.value],
				PropertyAction.Read
			);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			const [val] = res.value;
			if (!val || Object.keys(val).length === 0) {
				return error(403, 'Unauthorized');
			}
			if (data.keys.length > 0) {
				return filterKeys(data.keys)(val);
			}
			return val;
		}
	}
);

/**
 * Returns records by a list of ids.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {string[]} params.ids - Record ids.
 */
export const fromIds = query(
	z.object({
		struct: z.string(),
		ids: z.array(z.string()),
		cached: z.array(z.string()),
		keys: z.array(z.string()),
		pagination: z
			.object({
				page: z.number().min(1),
				limit: z.number().min(1).max(100)
			})
			.optional()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}
		const account = await getAccount();

		const retrieved = await registry.struct.fromIds(data.ids, {
			type: 'all'
		});
		if (retrieved.isErr()) {
			return error(500, 'Internal Server Error');
		}
		let value = retrieved.value;
		if (data.pagination) {
			value = value.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = value.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			payload = res.value;
		}
		if (data.keys.length > 0) {
			payload = payload.map(filterKeys(data.keys));
		}
		return {
			items: payload,
			total: 0
		};
	}
);

/**
 * Returns archived records.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.type - Query type.
 * @param {number} [params.limit] - Max results.
 * @param {number} [params.offset] - Offset for pagination.
 */
export const archived = query(
	z.object({
		struct: z.string(),
		cached: z.array(z.string()),
		keys: z.array(z.string()),
		pagination: z
			.object({
				page: z.number().min(1),
				limit: z.number().min(1).max(100)
			})
			.optional()
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}

		const retrieved = await registry.struct.archived({
			type: 'all'
		});

		if (retrieved.isErr()) {
			return error(500, 'Internal Server Error');
		}

		let value = retrieved.value;
		if (data.pagination) {
			value = value.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}

		const filtered = value.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.ReadArchive
			);

			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}

			payload = res.value;
		}
		if (data.keys.length > 0) {
			payload = payload.map(filterKeys(data.keys));
		}
		return {
			items: payload,
			total: 0
		};
	}
);

/**
 * Returns version history for a record.
 *
 * @param {object} params - Query parameters.
 * @param {string} params.struct - Struct name.
 * @param {string} params.id - Record id.
 */
export const versionHistory = query(
	z.object({
		struct: z.string(),
		id: z.string(),
		keys: z.array(z.string())
	}),
	async (data) => {
		const registry = structRegistry.get(data.struct);
		if (!registry) {
			return error(404, `Struct ${data.struct} not found`);
		}
		const account = await getAccount();

		const targetData = await registry.struct.fromId(data.id);
		if (targetData.isErr()) {
			return error(500, 'Internal Server Error');
		}
		if (!targetData.value) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const versions = await targetData.value.getVersions();
		if (versions.isErr()) {
			return error(500, 'Internal Server Error');
		}

		let payload: Record<string, unknown>[] = [];
		if (data.struct === 'test') {
			payload = versions.value.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const res = await Permissions.filterPropertyActionFromAccount(
				account,
				versions.value,
				PropertyAction.ReadVersionHistory
			);
			if (res.isErr()) {
				return error(500, 'Internal Server Error');
			}
			payload = res.value;
		}
		if (data.keys.length > 0) {
			payload = payload.map(filterKeys(data.keys));
		}
		return {
			items: payload,
			total: 0
		};
	}
);

// TODO: Pagination

/**
 * Executes multiple commands in a single request.
 *
 * @param {object} params - Batch parameters.
 * @param {string} params.struct - Struct name.
 * @param {Array<{ action: string; data: Record<string, unknown> }>} params.commands - Commands list.
 */
export const batchCommand = command(
	z.array(
		z.object({
			struct: z.string(),
			type: z.enum([
				'create',
				'update',
				'archive',
				'restoreArchive',
				'delete',
				'restoreVersion',
				'deleteVersion'
			]),
			data: z.unknown(),
			date: z.date()
		})
	),
	async (structBatch) => {
		return await Promise.all(
			structBatch.map(async (b) => {
				switch (b.type) {
					case 'create':
						return await create({
							struct: b.struct,
							...z
								.object({
									data: z.record(z.unknown()),
									attributes: z.array(z.string())
								})
								.parse(b.data)
						});
					case 'archive':
						return await archive({
							struct: b.struct,
							...z.object({ id: z.string() }).parse(b.data)
						});
					case 'restoreArchive':
						return await restoreArchive({
							struct: b.struct,
							...z.object({ id: z.string() }).parse(b.data)
						});
					case 'update':
						return await update({
							struct: b.struct,
							...z.object({ id: z.string(), data: z.record(z.unknown()) }).parse(b.data)
						});
					case 'delete':
						return await remove({
							struct: b.struct,
							...z.object({ id: z.string() }).parse(b.data)
						});
					case 'restoreVersion':
						return await restoreVersion({
							struct: b.struct,
							...z.object({ vhId: z.string() }).parse(b.data)
						});
					case 'deleteVersion':
						return await removeVersion({
							struct: b.struct,
							...z.object({ vhId: z.string() }).parse(b.data)
						});
				}
			})
		);
	}
);

/**
 * Executes multiple queries in a single request.
 *
 * @param {object} params - Batch parameters.
 * @param {string} params.struct - Struct name.
 * @param {Array<{ action: string; data: Record<string, unknown> }>} params.queries - Queries list.
 */
export const batchQuery = query(
	z.array(
		z.object({
			struct: z.string(),
			type: z.enum(['all', 'archived', 'fromIds', 'fromId', 'versionHistory', 'get']),
			data: z.unknown(),
			cached: z.array(z.string()).optional(),
			keys: z.array(z.string()).optional(),
			pagination: z
				.object({
					page: z.number().min(1),
					limit: z.number().min(1).max(100)
				})
				.optional()
		})
	),
	async (structBatch) => {
		return await Promise.all(
			structBatch.map(async (b) => {
				switch (b.type) {
					case 'all':
						return await all({
							struct: b.struct,
							cached: b.cached || [],
							keys: b.keys || [],
							pagination: b.pagination
						});
					case 'archived':
						return await archived({
							struct: b.struct,
							cached: b.cached || [],
							keys: b.keys || [],
							pagination: b.pagination
						});
					case 'fromIds':
						return await fromIds({
							struct: b.struct,
							ids: z.array(z.string()).parse(b.data),
							cached: b.cached || [],
							keys: b.keys || [],
							pagination: b.pagination
						});
					case 'fromId':
						return await fromId({
							struct: b.struct,
							id: z.string().parse(b.data),
							keys: b.keys || []
						});
					case 'versionHistory':
						return await versionHistory({
							struct: b.struct,
							id: z.string().parse(b.data),
							keys: b.keys || []
						});
					case 'get':
						return await get({
							struct: b.struct,
							data: z.record(z.unknown()).parse(b.data),
							cached: b.cached || [],
							keys: b.keys || [],
							pagination: b.pagination
						});
				}
			})
		);
	}
);
