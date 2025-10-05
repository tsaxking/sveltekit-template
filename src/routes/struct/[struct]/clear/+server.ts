import { Errors, EventSuccessCode, status } from '$lib/server/event-handler.js';
import { Account } from '$lib/server/structs/account.js';
import { Struct } from 'drizzle-struct/back-end';
import { DataAction } from 'drizzle-struct/types';

export const POST = async (event) => {
	// console.log('Clear struct request received');
	if (!event.locals.account) {
		return Errors.noAccount();
	}

	if (!(await Account.isAdmin(event.locals.account).unwrap())) {
		return Errors.notPermitted(event.locals.account, DataAction.Clear, event.params.struct);
	}

	const structName = event.params.struct;
	if (!structName) {
		return Errors.noStruct(structName);
	}

	const struct = Struct.structs.get(structName);
	if (!struct) {
		return Errors.noStruct(structName);
	}

	await struct.clear().unwrap();

	return status(
		{
			success: true,
			code: EventSuccessCode.OK
		},
		{
			status: 200
		}
	);
};
