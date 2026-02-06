/**
 * @fileoverview SSE init endpoint at `/api/sse/init/[uuid]`.
 */
import { sse } from '$lib/server/services/sse';

export async function GET(event) {
	const res = await sse.connect(event);
	if (res.isErr()) {
		console.error('SSE connect error:', res.error);
		return new Response('Server Error', { status: 500 });
	}
	return res.value;
}
