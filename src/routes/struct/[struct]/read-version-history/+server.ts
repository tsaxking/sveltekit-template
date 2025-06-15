import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const POST = async (event) => {
	// console.log('Read version history request for struct:', event.params.struct);
	if (event.params.struct !== 'test') {
		if (!event.locals.account) return Errors.noAccount();
	}
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}

	const body = await event.request.json();
	const safe = z
		.object({
			id: z.string()
		})
		.safeParse(body);

	if (!safe.success) return Errors.invalidBody(safe.error);

	const targetData = await struct.fromId(safe.data.id);
	if (targetData.isErr()) return Errors.internalError(targetData.error);
	if (!targetData.value) return Errors.noData(safe.data.id);

	const versions = await targetData.value.getVersions();
	if (versions.isErr()) {
		return Errors.internalError(versions.error);
	}

	let payload: Record<string, unknown>[] = [];
	if (struct.data.name === 'test') {
		payload = versions.value.map((d) => d.data);
	} else {
		if (!event.locals.account) {
			return Errors.noAccount();
		}
		{
			const blocks = struct.blocks.get(PropertyAction.ReadVersionHistory);
			if (blocks) {
				for (const block of blocks) {
					// Yes, await in a loop, but generally there should be only one or two blocks per action.
					const blocked = await block.fn(event, undefined);
					if (blocked) {
						return Errors.blocked(struct.name, PropertyAction.ReadVersionHistory, block.reason);
					}
				}
			}
		}
		const res = await Permissions.filterPropertyActionFromAccount(
			event.locals.account,
			versions.value,
			PropertyAction.ReadVersionHistory
		);
		if (res.isErr()) {
			return Errors.internalError(res.error);
		}
		payload = res.value;
	}

	return new Response(
		JSON.stringify({
			success: true,
			data: payload
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
};
