import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { DataAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const POST = async (event) => {
	if (!event.locals.account) return Errors.noAccount();
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);
	const body = await event.request.json();
	const safe = z
		.object({
			id: z.string()
		})
		.safeParse(body);

	if (!safe.success) return Errors.invalidBody(safe.error);

	const data = await struct.fromId(safe.data.id);
	if (data.isErr()) return Errors.internalError(data.error);
	if (!data.value) return Errors.noData(safe.data.id);

	const canDo = await Permissions.accountCanDo(
		event.locals.account,
		[data.value],
		DataAction.Archive
	);

	if (canDo.isErr()) {
		return Errors.internalError(canDo.error);
	}

	if (!canDo.value[0]) {
		return Errors.notPermitted(event.locals.account, DataAction.Delete, event.params.struct);
	}
	const did = await data.value.delete();
	if (did.isErr()) return Errors.internalError(did.error);

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
