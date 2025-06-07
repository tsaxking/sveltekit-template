import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import terminal from '$lib/server/utils/terminal.js';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { DataAction, PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const POST = async (event) => {
	if (!event.locals.account) return Errors.noAccount();
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	const data = await struct.archived({ type: 'all' });

	if (data.isErr()) {
		return Errors.internalError(data.error);
	}

	let payload: Record<string, unknown>[] = [];
	if (struct.data.name === 'test') {
		payload = data.value.map((d) => d.data);
	} else {
		const res = await Permissions.filterPropertyActionFromAccount(
			event.locals.account,
			data.value,
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
