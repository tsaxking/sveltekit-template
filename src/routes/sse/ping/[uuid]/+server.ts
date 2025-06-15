import { sse } from '$lib/server/services/sse.js';

export const GET = async (event) => {
	sse.receivePing(event.params.uuid);
	return new Response('Pong', {
		status: 200
	});
};
