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

	// Validate file type and size
	const maxFileSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxFileSize) {
		return json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
	}

	// Sanitize filename to prevent path traversal
	const sanitizedFileName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
	if (!sanitizedFileName || sanitizedFileName === '.' || sanitizedFileName === '..') {
		return json({ error: 'Invalid file name' }, { status: 400 });
	}

	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const fileId = `${Date.now()}-${sanitizedFileName}`;
	const filePath = path.join(UPLOAD_DIR, fileId);

	// Security: Ensure the resolved path is within UPLOAD_DIR
	const resolvedPath = path.resolve(filePath);
	const resolvedUploadDir = path.resolve(UPLOAD_DIR);
	if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
		throw error(403, 'Invalid file path');
	}

	// Ensure the upload directory exists
	await fs.mkdir(UPLOAD_DIR, { recursive: true });

	// Save the file
	await fs.writeFile(filePath, buffer);

	return json({ fileId });
}

export async function GET({ params }) {
	const { fileId } = params;

	// Security: Sanitize fileId to prevent path traversal
	const sanitizedFileId = path.basename(fileId);
	if (!sanitizedFileId || sanitizedFileId === '.' || sanitizedFileId === '..') {
		throw error(400, 'Invalid file ID');
	}

	// Security: Only allow alphanumeric, dash, underscore, and dot characters
	if (!/^[a-zA-Z0-9._-]+$/.test(sanitizedFileId)) {
		throw error(400, 'Invalid file ID format');
	}

	const filePath = path.join(UPLOAD_DIR, sanitizedFileId);

	// Security: Ensure the resolved path is within UPLOAD_DIR
	const resolvedPath = path.resolve(filePath);
	const resolvedUploadDir = path.resolve(UPLOAD_DIR);
	if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
		throw error(403, 'Access denied');
	}

	try {
		const file = await fs.readFile(filePath);
		return new Response(new Uint8Array(file), {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `inline; filename="${sanitizedFileId}"`
			}
		});
	} catch {
		throw error(404, 'File not found');
	}
}

export async function DELETE({ params }) {
	const { fileId } = params;

	// Security: Sanitize fileId to prevent path traversal
	const sanitizedFileId = path.basename(fileId);
	if (!sanitizedFileId || sanitizedFileId === '.' || sanitizedFileId === '..') {
		throw error(400, 'Invalid file ID');
	}

	// Security: Only allow alphanumeric, dash, underscore, and dot characters
	if (!/^[a-zA-Z0-9._-]+$/.test(sanitizedFileId)) {
		throw error(400, 'Invalid file ID format');
	}

	const filePath = path.join(UPLOAD_DIR, sanitizedFileId);

	// Security: Ensure the resolved path is within UPLOAD_DIR
	const resolvedPath = path.resolve(filePath);
	const resolvedUploadDir = path.resolve(UPLOAD_DIR);
	if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
		throw error(403, 'Access denied');
	}

	try {
		await fs.unlink(filePath);
		return new Response(undefined, { status: 200 });
	} catch {
		throw error(404, 'File not found');
	}
}
