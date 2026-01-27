/* eslint-disable @typescript-eslint/no-explicit-any */
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
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry.isBlocked(DataAction.Create, account).unwrap();
				if (blocked) {
					terminal.error(`Create action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.Create, account).unwrap()) {
				break PERMIT;
			}

			const canDo = await Permissions.canCreate(account, registry.struct, data.attributes).unwrap();
			if (!canDo) {
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

		await registry.struct
			.new({
				...data.data,
				attributes: JSON.stringify(data.attributes)
			})
			.unwrap();

		return {
			success: true
		};
	}
);

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

		const targetData = await registry.struct.fromId(data.id).unwrap();
		if (!targetData) {
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
			await targetData.update(data.data as any).unwrap();
			return { success: true };
		}

		const account = await getAccount();

		if (!account) {
			return error(403, 'Unauthorized');
		}

		const isAdmin = await Account.isAdmin(account).unwrap();

		BLOCKS: {
			if (isAdmin) break BLOCKS;
			if (await registry.isBlocked(PropertyAction.Update, account, targetData).unwrap()) {
				terminal.error(`Update action is blocked for struct ${data.struct}`);
				return error(403, 'Unauthorized');
			}
		}

		const filtered = await Permissions.filterPropertyActionFromAccount(
			account,
			[targetData],
			PropertyAction.Update
		).unwrap();

		const [canUpdate] = filtered;
		if (!canUpdate || Object.keys(canUpdate).length === 0) {
			return error(403, 'Unauthorized');
		}

		const toUpdate: Record<string, unknown> = {};
		for (const key in canUpdate) {
			if (Object.prototype.hasOwnProperty.call(data.data, key)) {
				(toUpdate as any)[key] = (data.data as any)[key];
			}
		}

		if (Date.now() < targetData.updated.getTime()) {
			terminal.error(`Data with id ${data.id} has a newer updated timestamp than the server time`);
		}

		await targetData.update(toUpdate as any).unwrap();

		return { success: true };
	}
);

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

		const targetData = await registry.struct.fromId(data.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry.isBlocked(DataAction.Archive, account, targetData).unwrap();
				if (blocked) {
					terminal.error(`Archive action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.Archive, account, targetData).unwrap()) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData],
				DataAction.Archive
			).unwrap();

			if (!canDo[0]) {
				return error(403, 'Unauthorized');
			}
		}

		await targetData.setArchive(true).unwrap();

		return { success: true };
	}
);

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

		const targetData = await registry.struct.fromId(data.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry
					.isBlocked(DataAction.RestoreArchive, account, targetData)
					.unwrap();
				if (blocked) {
					terminal.error(`RestoreArchive action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.RestoreArchive, account, targetData).unwrap()) {
				// Bypass permissions
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData],
				DataAction.RestoreArchive
			).unwrap();

			if (!canDo[0]) {
				return error(403, 'Unauthorized');
			}
		}

		await targetData.setArchive(false).unwrap();
		return { success: true };
	}
);

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

		await registry.struct.clear().unwrap();
		return { success: true };
	}
);

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

		const version = await registry.struct.fromVhId(data.vhId).unwrap();
		if (!version) {
			return error(404, `Version with vhId ${data.vhId} not found`);
		}

		const targetData = await registry.struct.fromId(version.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${version.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry
					.isBlocked(DataAction.RestoreVersion, account, targetData)
					.unwrap();
				if (blocked) {
					terminal.error(`RestoreVersion action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.RestoreVersion, account, targetData).unwrap()) {
				// Bypass permissions
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData],
				DataAction.RestoreVersion
			).unwrap();

			if (!canDo[0]) {
				return error(403, 'Unauthorized');
			}
		}

		await version.restore().unwrap();
		return { success: true };
	}
);

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

		const targetData = await registry.struct.fromId(data.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry.isBlocked(DataAction.Delete, account, targetData).unwrap();
				if (blocked) {
					terminal.error(`Delete action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.Delete, account, targetData).unwrap()) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData],
				DataAction.Delete
			).unwrap();

			if (!canDo[0]) {
				return error(403, 'Unauthorized');
			}
		}

		await targetData.delete().unwrap();
		return { success: true };
	}
);

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

		const version = await registry.struct.fromVhId(data.vhId).unwrap();
		if (!version) {
			return error(404, `Version with vhId ${data.vhId} not found`);
		}

		const targetData = await registry.struct.fromId(version.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${version.id} not found`);
		}

		const account = await getAccount();
		PERMIT: if (account && data.struct !== 'test') {
			if (await Account.isAdmin(account)) {
				// Admins can always archive data
				break PERMIT;
			}

			{
				const blocked = await registry
					.isBlocked(DataAction.DeleteVersion, account, targetData)
					.unwrap();
				if (blocked) {
					terminal.error(`DeleteVersion action is blocked for struct ${data.struct}`);
					return error(403, 'Unauthorized');
				}
			}
			if (await registry.isBypassed(DataAction.DeleteVersion, account, targetData).unwrap()) {
				break PERMIT;
			}

			const canDo = await Permissions.accountCanDo(
				account,
				[targetData],
				DataAction.DeleteVersion
			).unwrap();

			if (!canDo[0]) {
				return error(403, 'Unauthorized');
			}
		}

		await version.delete().unwrap();
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

		let retrieved = await registry.struct
			.all({
				type: 'all'
			})
			.unwrap();
		if (data.pagination) {
			retrieved = retrieved.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = retrieved.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			payload = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			).unwrap();
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

		let retrieved = await registry.struct
			.get(data.data as any, {
				type: 'all'
			})
			.unwrap();
		if (data.pagination) {
			retrieved = retrieved.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = retrieved.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			payload = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			).unwrap();
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

		const retrieved = await registry.struct.fromId(data.id).unwrap();
		if (!retrieved) {
			return error(404, `Data not found`);
		}

		if (data.struct === 'test') {
			return retrieved.data;
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			const [res] = await Permissions.filterPropertyActionFromAccount(
				account,
				[retrieved],
				PropertyAction.Read
			).unwrap();
			if (!res || Object.keys(res).length === 0) {
				return error(403, 'Unauthorized');
			}
			if (data.keys.length > 0) {
				return filterKeys(data.keys)(res);
			}
			return res;
		}
	}
);

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

		let retrieved = await registry.struct
			.fromIds(data.ids, {
				type: 'all'
			})
			.unwrap();
		if (data.pagination) {
			retrieved = retrieved.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}
		const filtered = retrieved.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			payload = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.Read
			).unwrap();
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

		let retrieved = await registry.struct
			.archived({
				type: 'all'
			})
			.unwrap();

		if (data.pagination) {
			retrieved = retrieved.slice(
				(data.pagination.page - 1) * data.pagination.limit,
				data.pagination.page * data.pagination.limit
			);
		}

		const filtered = retrieved.filter((d) => !data.cached.includes(d.id));

		let payload: Record<string, unknown>[] = [];
		const account = await getAccount();

		if (data.struct === 'test') {
			payload = filtered.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			payload = await Permissions.filterPropertyActionFromAccount(
				account,
				filtered,
				PropertyAction.ReadArchive
			).unwrap();
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

		const targetData = await registry.struct.fromId(data.id).unwrap();
		if (!targetData) {
			return error(404, `Data with id ${data.id} not found`);
		}

		const versions = await targetData.getVersions().unwrap();

		let payload: Record<string, unknown>[] = [];
		if (data.struct === 'test') {
			payload = versions.map((d) => d.data);
		} else {
			if (!account) {
				return error(403, 'Unauthorized');
			}
			payload = await Permissions.filterPropertyActionFromAccount(
				account,
				versions,
				PropertyAction.ReadVersionHistory
			).unwrap();
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
