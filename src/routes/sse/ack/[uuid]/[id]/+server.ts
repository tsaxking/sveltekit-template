import { sse } from '$lib/server/services/sse';

export const GET = async (event) => {
	const id = Number(event.params.id);
	if (Number.isNaN(id)) {
		return new Response('Invalid ID', { status: 400 });
	}

	const connection = sse.getConnection(event.params.uuid);
	if (!connection) {
		return new Response('No Connection', { status: 401 });
	}

	connection.ack(id);

	return new Response(null, { status: 204 });
};
