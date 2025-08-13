import { Errors, EventErrorCode, EventSuccessCode, status } from '$lib/server/event-handler.js';
import { CallListener } from '$lib/server/services/struct-listeners';
import { Struct } from 'drizzle-struct/back-end';

export const POST = async (event) => {
	// console.log('Custom request:', event.params.struct);
	// if (event.params.struct !== 'test') {
	// 	if (!event.locals.account) return Errors.noAccount();
	// }
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}
	const body = await event.request.json();

	const res = await CallListener.run(event, struct, event.params.function, body);
	if (res.isErr()) {
		return Errors.internalError(res.error);
	} else {
		// call listener was found
		if (res.value) {
			return status(
				{
					...res.value,
					code: res.value.success ? EventSuccessCode.OK : EventErrorCode.Unknown
				},
				{
					status: res.value.success ? 200 : 400
				}
			);
		}
	}

	// call listener was not found, use old api
	const listener = struct.callListeners.get(event.params.function);
	if (!listener) {
		return Errors.invalidAction(
			`Function ${event.params.function} not found in struct ${event.params.struct}`
		);
	}
	try {
		const res = await listener(event, body);

		return status(
			{
				success: res.success,
				message: res.message,
				code: res.success ? EventSuccessCode.OK : EventErrorCode.Unknown,
				data: res.data
			},
			{
				status: res.success ? 200 : 400
			}
		);
	} catch (error) {
		return Errors.internalError(error instanceof Error ? error : new Error('Unknown error'));
	}
};
