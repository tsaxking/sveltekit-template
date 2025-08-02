import fs from 'fs/promises';
import path from 'path';

export const GET = async (event) => {
	const file = await fs.readFile(path.resolve(process.cwd(), 'static', event.params.filepath));

	return new Response(new Uint8Array(file), {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `inline; filename="${event.params.filepath}"`
		}
	});
};
