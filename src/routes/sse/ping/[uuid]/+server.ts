import { sse } from '$lib/server/services/sse.js';

export const GET = async (event) => {
	sse.receivePing(event.params.uuid);
	const end = performance.now();
	const latency = end - event.locals.start;
	return new Response(`Pong:${latency}`, {
		status: 200
	});
};
