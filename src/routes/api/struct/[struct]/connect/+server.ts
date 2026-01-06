import { Errors, status, EventErrorCode, EventSuccessCode } from '$lib/server/event-handler.js';
import { Struct } from 'drizzle-struct/back-end';
import { z } from 'zod';

export const POST = async (event) => {
	// console.log('Connect request for struct:', event.params.struct);
	const data = await event.request.json();
	const name = event.params.struct;
	try {
		const typed = z
			.object({
				structure: z.record(z.string())
			})
			.parse(data);

		const struct = Struct.structs.get(name);
		if (!struct) return Errors.noStruct(name);

		if (!struct.frontend) {
			return Errors.noFrontend(name);
		}

		for (const [k, v] of Object.entries(struct.data.structure)) {
			if (!typed.structure[k]) {
				if (struct.data.safes?.includes(k)) {
					// We don't want safes on the front end
					continue;
				}
				return status(
					{
						success: false,
						message: `Error: key ${k} is missing from the structure`,
						code: EventErrorCode.InvalidBody
					},
					{ status: 400 }
				);
			}
			if (struct.data.safes?.includes(k) && typed.structure[k]) {
				return status(
					{
						success: false,
						message: `Error: key ${k} is a safe and should not be included in the structure`,
						code: EventErrorCode.InvalidBody
					},
					{
						status: 400
					}
				);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if (typed.structure[k] !== (v as any).config.dataType) {
				return status(
					{
						success: false,
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						message: `Error: key ${k} has an invalid data type, expected ${(v as any).config.dataType}, got ${typed.structure[k]}`,
						code: EventErrorCode.InvalidBody
					},
					{
						status: 400
					}
				);
			}
		}
	} catch (error) {
		return Errors.internalError(error as Error);
	}

	return status(
		{
			success: true,
			message: `Struct ${name} connected successfully`,
			code: EventSuccessCode.OK
		},
		{
			status: 200
		}
	);
};
