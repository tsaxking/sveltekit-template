import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import terminal from '$lib/server/utils/terminal.js';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const POST = async (event) => {
	if (!event.locals.account) return Errors.noAccount();
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);
	const body = await event.request.json();

	let data: StructData<Blank, string>[] = [];
	try {
		switch (event.params.readType) {
			case 'all':
				data = await struct.all({ type: 'all' }).unwrap();
				break;
			case 'archived':
				data = await struct.archived({ type: 'all' }).unwrap();
				break;
			case 'property':
				{
					const safe = z
						.object({
							key: z.string(),
							value: z.unknown()
						})
						.parse(body);
					data = await struct
						.fromProperty(
							safe.key,
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							safe.value as any,
							{ type: 'all' }
						)
						.unwrap();
				}
				break;
			case 'from-id':
				{
					const safe = z
						.object({
							id: z.string()
						})
						.parse(body);
					const found = await struct.fromId(safe.id).unwrap();
					if (!found) {
						return new Response(
							JSON.stringify({
								success: false,
								message: `Data with ID ${safe.id} not found.`
							}),
							{
								status: 404,
								headers: {
									'Content-Type': 'application/json'
								}
							}
						);
					}
					data = [found];
				}
				break;
			default:
				return new Response(
					JSON.stringify({
						success: false,
						message: `Invalid read type: ${event.params.readType}`
					}),
					{
						status: 400,
						headers: {
							'Content-Type': 'application/json'
						}
					}
				);
		}
	} catch (error) {
		terminal.error('Error fetching data:', error);
		return Errors.internalError(new Error('Failed to fetch data, please try again later.'));
	}

	let payload: Record<string, unknown>[] = [];
	if (struct.data.name === 'test') {
		payload = data.map((d) => d.data);
	} else {
		const res = await Permissions.filterPropertyActionFromAccount(
			event.locals.account,
			data,
			PropertyAction.Read
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
