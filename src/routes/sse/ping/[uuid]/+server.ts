import { sse } from '$lib/server/services/sse';

export const GET = async (event) => {
	const connection = sse.getConnection(event.params.uuid);
	if (!connection) {
		return new Response('No Connection', { status: 401 });
	}

	sse.receivePing(event.params.uuid);

	// Use Date.now() if performance.now() is unavailable or inconsistent
	const end = Date.now();
	const latency = end - (event.locals.start ?? end);

	return new Response(`Pong:${latency}`, { status: 200 });
};
