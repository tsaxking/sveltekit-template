import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export const GET = async (event) => {
  const staticDir = path.join(process.cwd(), 'static');
  const requestedPath = path.normalize(path.join(staticDir, event.params.filepath));

  // Ensure path stays within 'static' directory
  if (!requestedPath.startsWith(staticDir)) {
    return new Response('File not found', { status: 404 });
  }

  let file: Buffer;
  try {
    file = await fs.readFile(requestedPath);
  } catch {
    return new Response('File not found', { status: 404 });
  }

  const contentType = mime.lookup(requestedPath) || 'application/octet-stream';
  const safeFilename = path.basename(requestedPath);

  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${safeFilename}"`
    }
  });
};
