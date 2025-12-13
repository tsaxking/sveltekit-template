import { Errors } from '$lib/server/event-handler.js';
import { Permissions } from '$lib/server/structs/permissions.js';
import terminal from '$lib/server/utils/terminal.js';
import { fail } from '@sveltejs/kit';
import { Struct, StructData, type Blank } from 'drizzle-struct/back-end';
import { PropertyAction } from 'drizzle-struct/types';
import { z } from 'zod';

export const GET = async (event) => {
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

	const body = JSON.parse(event.request.headers.get('X-Body') || '{}');

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

	const paginated = event.url.searchParams.get('pagination') === 'true';
	const page = Number(event.url.searchParams.get('page') || '0');
	const size = Number(event.url.searchParams.get('size') || '10');

	let data: StructData<Blank, string>[] = [];
	let total = 0;
	try {
		switch (event.params.readType) {
			case 'all':
				if (paginated) {
					data = await struct
						.all({
							type: 'array',
							limit: size,
							offset: page * size
						})
						.unwrap();
					total = await struct.all({ type: 'count' }).unwrap();
				} else {
					data = await struct.all({ type: 'all' }).unwrap();
				}
				break;
			case 'archived':
				if (paginated) {
					data = await struct
						.archived({
							type: 'array',
							limit: size,
							offset: page * size
						})
						.unwrap();
					total = await struct.archived({ type: 'count' }).unwrap();
				} else {
					data = await struct.archived({ type: 'all' }).unwrap();
				}
				break;
			case 'property':
				{
					const safe = z
						.object({
							key: z.string(),
							value: z.unknown()
						})
						.parse(safeBody.data.args);
					if (paginated) {
						data = await struct
							.fromProperty(
								safe.key,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								safe.value as any,
								{
									type: 'array',
									limit: size,
									offset: page * size
								}
							)
							.unwrap();

						total = await struct
							.fromProperty(
								safe.key,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								safe.value as any,
								{ type: 'count' }
							)
							.unwrap();
					} else {
						data = await struct
							.fromProperty(
								safe.key,
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								safe.value as any,
								{ type: 'all' }
							)
							.unwrap();
					}
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
			case 'from-ids':
				{
					if (paginated) {
						throw fail(400, 'Pagination is not supported for from-ids read type.');
					}
					const safe = z
						.object({
							ids: z.array(z.string())
						})
						.parse(safeBody.data.args);
					data = await struct
						.fromIds(safe.ids, {
							type: 'all'
						})
						.unwrap();
				}
				break;
			case 'get': {
				const safe = z
					.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
					.parse(safeBody.data.args);
				if (paginated) {
					data = await struct
						.get(
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							safe as any,
							{
								type: 'array',
								limit: size,
								offset: page * size
							}
						)
						.unwrap();
				} else {
					data = await struct
						.get(
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							safe as any,
							{ type: 'all' }
						)
						.unwrap();
				}
				// Read by multiple properties
				break;
			}
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
				'Content-Type': 'application/json',
				'X-Total-Count': String(total)
			}
		}
	);
};
