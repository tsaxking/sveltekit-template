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
			attributes: z.array(z.string()),
			data: z.record(z.unknown())
		})
		.safeParse(body);

	if (!safe.success) return Errors.invalidBody(safe.error);

	const canDo = await Permissions.canCreate(event.locals.account, struct, safe.data.attributes);

	if (canDo.isErr()) {
		return Errors.internalError(canDo.error);
	}

	const validateRes = struct.validate(safe.data.data, {
		optionals: [
			'id',
			'created',
			'updated',
			'archived',
			'universe',
			'attributes',
			'lifetime',
			'canUpdate'
		]
	});

	if (!validateRes.success) {
		return new Response(
			JSON.stringify({
				success: false,
				message: 'Invalid data',
				errors: validateRes.reason
			}),
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}

	const res = await struct.new({
		...safe.data.data,
		attributes: JSON.stringify(safe.data.attributes)
	});

	if (res.isErr()) {
		return Errors.internalError(res.error);
	}

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
