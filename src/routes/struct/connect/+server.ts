import { Struct } from 'drizzle-struct/back-end';
import { z } from 'zod';

export const POST = async (event) => {
	const data = await event.request.json();
	try {
		const typed = z
			.object({
				name: z.string(),
				structure: z.record(z.string())
			})
			.parse(data);

		const struct = Struct.structs.get(typed.name);
		if (!struct)
			return new Response(
				JSON.stringify({
					success: false,
					message: `Struct ${typed.name} not found`
				}),
				{ status: 200 }
			);

		for (const [k, v] of Object.entries(struct.data.structure)) {
			if (!typed.structure[k]) {
				if (struct.data.safes?.includes(k)) {
					// We don't want safes on the front end
					continue;
				}
				return new Response(
					JSON.stringify({
						success: false,
						message: `Missing key ${k}`
					}),
					{ status: 400 }
				);
			}
			if (struct.data.safes?.includes(k) && typed.structure[k]) {
				return new Response(
					JSON.stringify({
						success: false,
						message: `Error: key ${k} is a safe key. It should not exist on the front end.`
					}),
					{ status: 400 }
				);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if (typed.structure[k] !== (v as any).config.dataType) {
				return new Response(
					JSON.stringify({
						success: false,
						message: `Error: invalid type for key ${k}`
					}),
					{ status: 400 }
				);
			}
		}
	} catch (error) {
		console.error(error);
		return new Response(
			JSON.stringify({
				success: false,
				message: 'Invalid struct data'
			}),
			{ status: 200 }
		);
	}

	return new Response(
		JSON.stringify({
			success: true,
			message: 'Struct exists and is valid'
		}),
		{ status: 200 }
	);
};
