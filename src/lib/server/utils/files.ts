import { Readable } from 'stream';
import Busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import { uuid } from './uuid';
import { attemptAsync } from 'ts-utils/check';

const UPLOAD_DIR = path.resolve(process.cwd(), 'static/uploads');

// Ensure the upload directory exists
fs.promises.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

interface RequestEvent {
	request: {
		headers: Headers;
		body: ReadableStream<Uint8Array> | null;
	};
}

export class FileReceiver {
	constructor(
		public readonly config: {
			maxFileSize: number; // In bytes
			maxFiles: number; // Maximum number of files allowed
		}
	) {}

	async receive({ request }: RequestEvent) {
		return attemptAsync(async () => {
			if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
				throw new Error('Invalid content type. Expected multipart/form-data.');
			}

			if (!request.body) {
				throw new Error('No body found in request.');
			}

			const busboy = Busboy({
				headers: {
					'content-type': request.headers.get('content-type') || ''
				},
				limits: {
					fileSize: this.config.maxFileSize,
					files: this.config.maxFiles
				}
			});

			const files: { fieldName: string; filePath: string }[] = [];
			let fileCount = 0;

			return new Promise<{
				files: { fieldName: string; filePath: string }[];
			}>((resolve, reject) => {
				// Adapt the ReadableStream to a Node.js Readable
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const nodeStream = Readable.from(request.body as any);

				busboy.on('file', (fieldName, file, fileInfo) => {
					if (fileCount >= this.config.maxFiles) {
						file.resume(); // Discard the rest of the file
						return reject(new Error('Exceeded the maximum allowed number of files.'));
					}

					const fileName = fileInfo.filename;

					const safeFileName = `${uuid()}_${fileName}`;
					const filePath = path.join(UPLOAD_DIR, safeFileName);

					const writeStream = fs.createWriteStream(filePath);
					file.pipe(writeStream);

					fileCount++;

					file.on('end', () => {
						files.push({ fieldName, filePath });
					});

					file.on('error', (err) => {
						reject(err);
					});
				});

				busboy.on('finish', () => {
					resolve({ files });
				});

				busboy.on('error', (err) => {
					reject(err);
				});

				nodeStream.pipe(busboy);
			});
		});
	}
}

type FileTree = {
	name: string;
	children?: FileTree[];
	path: string;
}

export const fileTree = (dir: string) => {
	return attemptAsync<FileTree>(async () => {
		const read = async (subDir: string): Promise<FileTree> => {
			const tree = await fs.promises.readdir(subDir, { withFileTypes: true }).then(async entries => {
				return Promise.all(entries.map(async (entry) => {
					const fullPath = path.join(subDir, entry.name);
					if (entry.isDirectory()) {
						return read(fullPath);
					} else {
						return { 
							name: entry.name,
							path: path.relative(dir, fullPath),
						};
					}
				}));
			});
			return {
				name: path.basename(subDir),
				children: tree.filter(Boolean) as FileTree[],
				path: path.relative(dir, subDir),
			}
		}

		return read(dir);
	});
}