/* eslint-disable @typescript-eslint/no-explicit-any */
import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';
import terminal from '$lib/server/utils/terminal';
import { Account } from '$lib/server/structs/account.js';

export const POST = async (event) => {
	if (event.params.struct !== 'test') {
		if (!event.locals.account) return Errors.noAccount();
	}

	let isAdmin = false;
	if (event.locals.account) {
		// only will enter if not test struct
		isAdmin = await Account.isAdmin(event.locals.account).unwrapOr(false);
	}

	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}

	const body = await event.request.json();
	const date = new Date(Number(event.request.headers.get('X-Date')) || Date.now());

	const safe = z
		.object({
			data: z.record(z.unknown()),
			id: z.string()
		})
		.safeParse(body);

	if (!safe.success) return Errors.invalidBody(safe.error);

	const targetData = await struct.fromId(safe.data.id);
	if (targetData.isErr()) return Errors.internalError(targetData.error);
	if (!targetData.value) return Errors.noData(safe.data.id);

	// Delete sensitive data that should not be updated by users:
	{
		delete (safe.data as any).id;
		delete (safe.data as any).created;
		delete (safe.data as any).updated;
		delete (safe.data as any).archived;
		// delete (event.data as any).universes;
		delete (safe.data as any).attributes;
		delete (safe.data as any).lifetime;
		delete (safe.data as any).canUpdate;
		delete (safe.data as any).universe;

		for (const key of struct.data.safes || []) {
			delete (safe.data as any)[key];
		}

		if (struct.data.safes !== undefined) {
			for (const key of Object.keys(safe.data as object)) {
				if (struct.data.safes.includes(key)) {
					// user may not update safes
					delete (safe.data as any)[key];
				}
			}
		}
	}

	if (event.params.struct === 'test') {
		// it is a test struct, so we allow anyone to update it
		const res = await targetData.value.update(safe.data.data as any);
		if (res.isErr()) return Errors.internalError(res.error);
		return new Response(
			JSON.stringify({
				success: true
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}

	if (!event.locals.account) {
		return Errors.noAccount(); // Should not happen due to the check above, but just in case and for type safety
	}

	BLOCKS: {
		if (isAdmin) break BLOCKS;
		const blocks = struct.blocks.get(PropertyAction.Update);
		if (blocks) {
			for (const block of blocks) {
				// Yes, await in a loop, but generally there should be only one or two blocks per action.
				const blocked = await block.fn(event, body);
				if (blocked) {
					return Errors.blocked(struct.name, PropertyAction.Update, block.reason);
				}
			}
		}
	}

	const filtered = await Permissions.filterPropertyActionFromAccount(
		event.locals.account,
		[targetData.value],
		PropertyAction.Update
	);

	if (filtered.isErr()) {
		return Errors.internalError(filtered.error);
	}

	const [canUpdate] = filtered.value;
	if (!canUpdate || Object.keys(canUpdate).length === 0) {
		return Errors.notPermitted(event.locals.account, PropertyAction.Update, event.params.struct);
	}

	const parsedData = safe.data.data;

	const toUpdate = {};
	for (const key in canUpdate) {
		if (Object.prototype.hasOwnProperty.call(parsedData, key)) {
			(toUpdate as any)[key] = parsedData[key];
		}
	}

	if (date.getTime() < targetData.value.updated.getTime()) {
		terminal.warn(
			`The data you are trying to update is outdated. Please refresh and try again. Current: ${targetData.value.updated.toISOString()}, Your: ${date.toISOString()}`
		);
	}

	const res = await targetData.value.update(toUpdate);
	if (res.isErr()) return Errors.internalError(res.error);

	return new Response(
		JSON.stringify({
			success: true
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
};
