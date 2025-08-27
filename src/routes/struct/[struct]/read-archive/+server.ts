import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';

export const POST = async (event) => {
	// console.log('Read archive request for struct:', event.params.struct);
	if (event.params.struct !== 'test') {
		if (!event.locals.account) return Errors.noAccount();
	}
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}

	const data = await struct.archived({ type: 'all' });
	if (data.isErr()) {
		return Errors.internalError(data.error);
	}

	let payload: Record<string, unknown>[] = [];
	if (struct.data.name === 'test') {
		payload = data.value.map((d) => d.data);
	} else {
		if (!event.locals.account) {
			return Errors.noAccount();
		}
		{
			const blocks = struct.blocks.get(PropertyAction.ReadArchive);
			if (blocks) {
				for (const block of blocks) {
					// Yes, await in a loop, but generally there should be only one or two blocks per action.
					const blocked = await block.fn(event, undefined);
					if (blocked) {
						return Errors.blocked(struct.name, PropertyAction.ReadArchive, block.reason);
					}
				}
			}
		}
		const res = await Permissions.filterPropertyActionFromAccount(
			event.locals.account,
			data.value,
			PropertyAction.ReadArchive
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
