import { json, error } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.resolve('static/uploads'); // Store files in the `static/uploads` folder

export async function POST({ request }) {
	const formData = await request.formData();
	const file = formData.get('filepond') as File; // `filepond` is the default field name

	if (!file) {
		return json({ error: 'No file uploaded' }, { status: 400 });
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const fileId = `${Date.now()}-${file.name}`;
	const filePath = path.join(UPLOAD_DIR, fileId);

	// Ensure the upload directory exists
	await fs.mkdir(UPLOAD_DIR, { recursive: true });

	// Save the file
	await fs.writeFile(filePath, buffer);

	return json({ fileId });
}

export async function GET({ params }) {
	const { fileId } = params;
	const filePath = path.join(UPLOAD_DIR, fileId);

	try {
		const file = await fs.readFile(filePath);
		return new Response(new Uint8Array(file), {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `inline; filename="${fileId}"`
			}
		});
	} catch {
		throw error(404, 'File not found');
	}
}

// export async function DELETE({ params }) {
//   const { fileId } = params;
//   const filePath = path.join(UPLOAD_DIR, fileId);

//   try {
//     await fs.unlink(filePath);
//     return new Response(undefined, { status: 200 });
//   } catch {
//     throw error(404, 'File not found');
//   }
// }
