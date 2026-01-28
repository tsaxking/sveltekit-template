/**
 * @fileoverview Test SSE init endpoint at `/test/sse/init`.
 */
import { sse } from '$lib/server/services/sse.js';

export const POST = (event) => {
	let i = 0;
	const interval = setInterval(() => {
		const uuid = event.request.headers.get('X-Metadata');
		if (!uuid) return;
		sse.getConnection(uuid)?.send('you-are', `${uuid} ${i}`);
		if (i++ > 10) {
			clearInterval(interval);
		}
	});

	return new Response(
		JSON.stringify({
			message: 'Hello from the server!'
		}),
		{
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
};
