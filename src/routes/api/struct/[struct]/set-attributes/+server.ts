import { Account } from '$lib/server/structs/account.js';
import { fail, json } from '@sveltejs/kit';
import { Struct } from 'drizzle-struct/back-end';
import { ServerCode } from 'ts-utils/status';
import { z } from 'zod';

// This endpoint is only exposed to admins because it will severly impact permissions

export const POST = async (event) => {
	if (!event.locals.account) {
		throw fail(ServerCode.unauthorized);
	}

	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		throw fail(ServerCode.unauthorized);
	}

	const parsed = z
		.object({
			attributes: z.array(z.string()),
			id: z.string()
		})
		.safeParse(await event.request.json());

	if (!parsed.success) {
		throw fail(ServerCode.badRequest, {
			message: `Invalid request body: ${parsed.error.message}`
		});
	}

	const struct = Struct.structs.get(event.params.struct);
	if (!struct) {
		throw fail(ServerCode.notFound, {
			message: `Struct ${event.params.struct} not found`
		});
	}

	const data = await struct.fromId(parsed.data.id);
	if (data.isErr()) {
		throw fail(ServerCode.internalServerError, {
			message: `Failed to fetch data for ID ${parsed.data.id}: ${data.error}`
		});
	}

	if (!data.value) {
		throw fail(ServerCode.notFound, {
			message: `Data with ID ${parsed.data.id} not found`
		});
	}

	const res = await data.value.setAttributes(parsed.data.attributes);

	if (res.isErr()) {
		throw fail(ServerCode.internalServerError, {
			message: `Failed to set attributes for ID ${parsed.data.id}: ${res.error}`
		});
	}

	return json({
		success: true,
		message: 'Attributes set successfully'
	});
};
