import { FileReceiver } from '$lib/server/utils/files';
import { error } from '@sveltejs/kit';

export const POST = async (event) => {
	const account = event.locals.account;
	if (!account) {
		return error(401, 'Unauthorized');
	}

	const fr = new FileReceiver({
		maxFileSize: 1024 * 1024 * 10, // 10MB
		maxFiles: 1
	});

	const res = await fr.receive(event);

	if (res.isErr()) {
		console.error(res.error);
		return error(500, 'Failed to receive file');
	}

	// account.update({
	// 	picture: res.value.files[0].filePath
	// });

	return new Response('OK');
};
