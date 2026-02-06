/**
 * @fileoverview Test upload endpoint at `/test/upload`.
 */
import { json, fail } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { ServerCode } from 'ts-utils/status';
import { FileUploader } from '$lib/server/services/file-upload';

const UPLOAD_DIR = path.resolve(process.cwd(), './static/uploads');
const fileUploader = new FileUploader(UPLOAD_DIR);

export async function POST(event) {
	const request = event.request;
	const formData = await request.formData();
	const file = formData.get('file'); // Assuming 'files[]' is the field name used

	await fs.mkdir(UPLOAD_DIR, { recursive: true });

	if (file instanceof File) {
		if (!event.locals.account) {
			throw fail(ServerCode.unauthorized);
		}
		try {
			const result = await fileUploader.receiveFile(file, event.locals.account);
			return json(result);
		} catch (err) {
			console.error(`Error uploading file: ${err instanceof Error ? err.message : String(err)}`);
			return json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
		}
	} else {
		return json({ error: 'Invalid file uploaded' }, { status: 400 });
	}
}
