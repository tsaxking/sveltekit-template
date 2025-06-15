import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import terminal from '$lib/server/utils/terminal.js';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const POST = async (event) => {
	// console.log('Read request for struct:', event.params.struct, event.params.readType);
	if (event.params.struct !== 'test') {
		if (!event.locals.account) return Errors.noAccount();
	}
	const struct = Struct.structs.get(event.params.struct);
	if (!struct) return Errors.noStruct(event.params.struct);

	if (!struct.frontend) {
		return Errors.noFrontend(struct.name);
	}

	// console.log(event.params.readType, 'is the read type');
	const body = await event.request.json();
	const safeBody = z
		.object({
			args: z.unknown()
		})
		.safeParse(body);

	if (!safeBody.success) {
		return Errors.invalidBody(safeBody.error);
	}

	{
		const blocks = struct.blocks.get(PropertyAction.Read);
		if (blocks) {
			for (const block of blocks) {
				// Yes, await in a loop, but generally there should be only one or two blocks per action.
				const blocked = await block.fn(event, body);
				if (blocked) {
					return Errors.blocked(struct.name, PropertyAction.Read, block.reason);
				}
			}
		}
	}

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
						.parse(safeBody.data.args);
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
						.parse(safeBody.data.args);
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
				terminal.error('Invalid read type:', event.params.readType);
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
		if (!event.locals.account) {
			return Errors.noAccount();
		}
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

	// console.log('Read response payload:', payload);

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
