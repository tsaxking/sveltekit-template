import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import { Struct } from 'drizzle-struct/back-end';
import { DataAction } from 'drizzle-struct/types';
import { z } from 'zod';
import { Logs } from '$lib/server/structs/log.js';
import { Account } from '$lib/server/structs/account.js';

export const POST = async (event) => {
	// console.log('Delete request for struct:', event.params.struct);
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

	const data = await struct.fromId(safe.data.id);
	if (data.isErr()) return Errors.internalError(data.error);
	if (!data.value) return Errors.noData(safe.data.id);

	PERMIT: if (event.locals.account && event.params.struct !== 'test') {
		if (await Account.isAdmin(event.locals.account)) {
			// Admins can always archive data
			break PERMIT;
		}
		{
			const blocks = struct.blocks.get(DataAction.Delete);
			if (blocks) {
				for (const block of blocks) {
					// Yes, await in a loop, but generally there should be only one or two blocks per action.
					const blocked = await block.fn(event, body);
					if (blocked) {
						return Errors.blocked(struct.name, DataAction.Delete, block.reason);
					}
				}
			}
		}
		const value = data.value;
		const account = event.locals.account;
		if (
			struct.bypasses.some(
				(b) => b.action === DataAction.Delete && b.condition(account, value.data)
			)
		) {
			break PERMIT;
		}
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
	}
	const did = await data.value.delete();
	if (did.isErr()) return Errors.internalError(did.error);

	Logs.log({
		struct: struct.name,
		dataId: data.value.id,
		accountId: event.locals.account?.id || 'unknown',
		type: 'delete',
		message: `${event.locals.account?.data.username || 'unknown'} archived data with id ${data.value.id}`
	});

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
