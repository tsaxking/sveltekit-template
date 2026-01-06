import { Errors, EventErrorCode, EventSuccessCode, status } from '$lib/server/event-handler.js';
import { Struct } from 'drizzle-struct/back-end';
import { SendListener } from '$lib/server/services/struct-listeners';

export const GET = async (event) => {
	// console.log('Custom request:', event.params.struct, event.params.function);
	// if (event.params.struct !== 'test') {
	// 	if (!event.locals.account) return Errors.noAccount();
	// }
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}
	const body = JSON.parse(event.request.headers.get('X-Body') || '{}');

	const res = await SendListener.run(event, struct, event.params.function, body);
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

	const listener = struct.sendListeners.get(event.params.function);
	if (!listener) {
		return Errors.invalidAction(
			`Function ${event.params.function} not found in struct ${event.params.struct}`
		);
	}
	try {
		const res = await listener(event, body);

		return status(
			{
				success: true,
				code: EventSuccessCode.OK,
				data: res
			},
			{
				status: 200
			}
		);
	} catch (error) {
		return Errors.internalError(error instanceof Error ? error : new Error('Unknown error'));
	}
};
