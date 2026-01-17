import { Errors, EventSuccessCode, status } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { z } from 'zod';
import { DataAction } from 'drizzle-struct/types';
import { Logs } from '$lib/server/structs/log.js';
import { Account } from '$lib/server/structs/account.js';

export const POST = async (event) => {
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
			attributes: z.array(z.string()),
			data: z.record(z.unknown())
		})
		.safeParse(body);

	if (!safe.success) return Errors.invalidBody(safe.error);
	PERMIT: if (event.locals.account && event.params.struct !== 'test') {
		if (await Account.isAdmin(event.locals.account)) {
			// Admins can always archive data
			break PERMIT;
		}

		{
			const blocks = struct.blocks.get(DataAction.Create);
			if (blocks) {
				for (const block of blocks) {
					// Yes, await in a loop, but generally there should be only one or two blocks per action.
					const blocked = await block.fn(event, body);
					if (blocked) {
						return Errors.blocked(struct.name, DataAction.Create, block.reason);
					}
				}
			}
		}
		const account = event.locals.account;
		if (
			struct.bypasses.some(
				(b) => b.action === DataAction.Create && b.condition(account, safe.data.data)
			)
		) {
			break PERMIT;
		}

		const canDo = await Permissions.canCreate(event.locals.account, struct, safe.data.attributes);

		if (canDo.isErr()) {
			return Errors.internalError(canDo.error);
		}
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
			'canUpdate',
			'hash'
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

	Logs.log({
		struct: struct.name,
		dataId: res.value.id,
		accountId: event.locals.account?.id || 'unknown',
		type: 'create',
		message: `${event.locals.account?.data.username || 'unknown'} archived data with id ${res.value.id}`
	});

	return status(
		{
			success: true,
			message: 'Data created successfully',
			code: EventSuccessCode.OK
		},
		{
			status: 201
		}
	);
};
