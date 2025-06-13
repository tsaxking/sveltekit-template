import { sse } from '$lib/server/services/sse.js';
import terminal from '$lib/server/utils/terminal';

// setInterval(() => {
// 	sse.send('ping', null);
// }, 1000);

export async function GET(event) {
	const res = await sse.connect(event);
	if (res.isErr()) {
		terminal.error(res.error);
		return new Response('Server Error', {
			status: 500
		});
	}
	return res.unwrap();
}
