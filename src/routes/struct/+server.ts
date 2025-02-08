import { Struct } from 'drizzle-struct/back-end';

export const POST = async (event) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const res = await Struct.handler(event as any);
	if (res.isErr()) {
		console.error(res.error);
		return new Response(
			JSON.stringify({
				success: false,
				message: res.error.message
			}),
			{ status: 500 }
		);
	}
	return res.value;
};
