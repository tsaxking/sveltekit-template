import { json } from '@sveltejs/kit';
import { z } from 'zod';

export const POST = async (event) => {
	const data = await event.request.json();
	const schema = z.array(
		z.object({
			struct: z.string(),
			type: z.string(),
			data: z.unknown(),
			id: z.string(),
			date: z.string()
		})
	);

	return json(
		await Promise.all(
			schema.parse(data).map(async (item) => {
				const res = await event
					.fetch(`/api/struct/${item.struct}/${item.type}`, {
						body: JSON.stringify(item.data),
						method: 'POST',
						headers: {
							'X-Date': item.date,
							'Content-Type': 'application/json'
						}
					})
					.then((r) => r.json())
					.catch((e) => {
						console.error('Error fetching struct data:', e);
						return { success: false, message: 'Failed to fetch struct data' };
					});

				return {
					...z
						.object({
							success: z.boolean(),
							message: z.string().optional(),
							data: z.unknown().optional()
						})
						.parse(res),
					id: item.id
				};
			})
		)
	);
};
