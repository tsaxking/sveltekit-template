import fs from 'fs/promises';
import path from 'path';

export const GET = async (event) => {
	// File path cannot escape the 'static' directory
	if (!event.params.filepath || event.params.filepath.includes('..')) {
		return new Response('File not found', { status: 404 });
	}

	const file = await fs.readFile(path.join(process.cwd(), 'static', event.params.filepath));

	return new Response(new Uint8Array(file), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `inline; filename="${event.params.filepath}"`
		}
	});
};
