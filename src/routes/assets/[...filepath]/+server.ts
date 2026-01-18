import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export const GET = async (event) => {
	const staticDir = path.join(process.cwd(), 'static');

	// Security: Validate filepath parameter exists
	if (!event.params.filepath) {
		return new Response('File not found', { status: 404 });
	}

	// Security: Prevent path traversal by rejecting paths with '..'
	if (event.params.filepath.includes('..')) {
		return new Response('Access denied', { status: 403 });
	}

	// Security: Normalize and resolve the path
	const requestedPath = path.resolve(path.join(staticDir, event.params.filepath));

	// Security: Ensure path stays within 'static' directory using resolved paths
	const resolvedStaticDir = path.resolve(staticDir);
	if (
		!(requestedPath.startsWith(resolvedStaticDir + path.sep) || requestedPath === resolvedStaticDir)
	) {
		return new Response('Access denied', { status: 403 });
	}

	let file: Buffer;
	try {
		const stat = await fs.stat(requestedPath);
		// Security: Prevent directory listing
		if (stat.isDirectory()) {
			return new Response('Access denied', { status: 403 });
		}
		file = await fs.readFile(requestedPath);
	} catch {
		return new Response('File not found', { status: 404 });
	}

	const contentType = mime.lookup(requestedPath) || 'application/octet-stream';
	const safeFilename = path.basename(requestedPath);

	// Security: Escape filename to prevent header injection
	const escapedFilename = safeFilename.replace(/["\\]/g, '\\$&');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new Response(file as any, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `inline; filename="${escapedFilename}"`,
			// Security: Prevent browser from interpreting files as scripts
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
