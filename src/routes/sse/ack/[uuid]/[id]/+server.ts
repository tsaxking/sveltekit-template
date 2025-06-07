import { sse } from '$lib/server/services/sse';

export const GET = async (event) => {
	const id = event.params.id;
	const connection = sse.getConnection(event.params.uuid);
	if (!connection) {
		return new Response('No Connection', {
			status: 401
		});
	}
	connection.ack(+id);

	return new Response('OK');
};
