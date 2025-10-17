import { Errors, EventErrorCode, EventSuccessCode, status } from '$lib/server/event-handler.js';
import { QueryListener } from '$lib/server/services/struct-listeners';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { z } from 'zod';

export const GET = async (event) => {
	// console.log('Custom request:', event.params.struct);
	// if (event.params.struct !== 'test') {
	// 	if (!event.locals.account) return Errors.noAccount();
	// }
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}

	const body = JSON.parse(event.request.headers.get('X-Body') || '{}');
	const res = await QueryListener.run(event, struct, body);
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

	const safe = z
		.object({
			args: z.object({
				query: z.string(),
				data: z.unknown()
			})
		})
		.safeParse(body);

	if (!safe.success) {
		return Errors.invalidBody(safe.error);
	}

	const listener = struct.queryListeners.get(safe.data.args.query);
	if (!listener) {
		return Errors.invalidAction(
			`Function ${safe.data.args.query} not found in struct ${event.params.struct}`
		);
	}
	try {
		const res = await listener.fn(event, safe.data.args.data);

		if (res instanceof Error) {
			return Errors.internalError(res);
		}

		let data: StructData<Blank, string>[] = [];
		if (Array.isArray(res)) {
			data = res;
		} else {
			data = await res.await().unwrap();
		}

		return status(
			{
				success: true,
				code: EventSuccessCode.OK,
				data: data.map((d) => d.safe())
			},
			{
				status: 200
			}
		);
	} catch (error) {
		return Errors.internalError(error instanceof Error ? error : new Error('Unknown error'));
	}
};
