import { Readable } from 'stream';
import Busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import { uuid } from './uuid';
import { attemptAsync, attempt } from 'ts-utils/check';
import { z } from 'zod';
import { parse } from 'comment-json';

/**
 * Directory where uploaded files are stored
 * @constant {string}
 */
const UPLOAD_DIR = path.resolve(process.cwd(), 'static/uploads');

// Ensure the upload directory exists
fs.promises.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

/**
 * Request event interface for SvelteKit request handling
 * @interface RequestEvent
 */
interface RequestEvent {
	request: {
		headers: Headers;
		body: ReadableStream<Uint8Array> | null;
	};
}

/**
 * File upload receiver that handles multipart/form-data file uploads with size and count limits.
 * Uses Busboy to parse multipart data and saves files to the static/uploads directory.
 *
 * @export
 * @class FileReceiver
 */
export class FileReceiver {
	/**
	 * Creates an instance of FileReceiver.
	 *
	 * @constructor
	 * @param {object} config - Configuration for file upload limits
	 * @param {number} config.maxFileSize - Maximum file size in bytes
	 * @param {number} config.maxFiles - Maximum number of files allowed per request
	 */
	constructor(
		public readonly config: {
			maxFileSize: number; // In bytes
			maxFiles: number; // Maximum number of files allowed
		}
	) {}

	/**
	 * Receives and processes multipart/form-data file uploads from a request.
	 * Validates content type, enforces file limits, and saves files with unique names.
	 *
	 * @async
	 * @param {RequestEvent} { request } - SvelteKit request event containing the multipart data
	 * @returns {Promise<AttemptAsync<{files: {fieldName: string, filePath: string}[]}>>} Promise resolving to uploaded file information
	 * @throws {Error} When content type is invalid, no body is present, or file limits are exceeded
	 * @example
	 * ```typescript
	 * const receiver = new FileReceiver({ maxFileSize: 10 * 1024 * 1024, maxFiles: 5 });
	 * const result = await receiver.receive({ request });
	 * if (result.isOk()) {
	 *   console.log('Files uploaded:', result.value.files);
	 * }
	 * ```
	 */
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

/**
 * Represents a file or directory in a hierarchical tree structure
 *
 * @export
 * @typedef {FileTree}
 */
export type FileTree = {
	/** Base name of the file or directory */
	name: string;
	/** Child nodes for directories (undefined for files) */
	children?: FileTree[];
	/** Relative path from the root directory */
	path: string;
	/** Type indicator for file or directory */
	type: 'directory' | 'file';
	/** Absolute path to the file or directory */
	fullPath: string;
};

/**
 * Recursively builds a file tree structure for a given directory.
 * Reads the directory contents and creates a hierarchical representation.
 *
 * @export
 * @async
 * @param {string} dir - Root directory path to build tree from
 * @returns {Promise<AttemptAsync<FileTree>>} Promise resolving to the file tree structure
 * @example
 * ```typescript
 * const tree = await fileTree('./src');
 * if (tree.isOk()) {
 *   console.log('Directory structure:', tree.value);
 * }
 * ```
 */
export const fileTree = (dir: string) => {
	return attemptAsync<FileTree>(async () => {
		const read = async (subDir: string): Promise<FileTree> => {
			const tree = await fs.promises
				.readdir(subDir, { withFileTypes: true })
				.then(async (entries) => {
					return Promise.all(
						entries.map(async (entry) => {
							const fullPath = path.join(subDir, entry.name);
							if (entry.isDirectory()) {
								return read(fullPath);
							} else {
								return {
									name: entry.name,
									path: path.relative(dir, fullPath),
									type: 'file' as const,
									fullPath
								};
							}
						})
					);
				});
			return {
				name: path.basename(subDir),
				children: tree.filter(Boolean) as FileTree[],
				path: path.relative(dir, subDir),
				type: 'directory',
				fullPath: subDir
			};
		};

		return read(dir);
	});
};

/**
 * Generates a searchable file by concatenating all files in a directory tree.
 * Creates a single file with special markers for file boundaries to enable fast searching.
 * Each file's content is wrapped with --[fileName:start]-- and --[fileName:end]-- markers.
 *
 * @export
 * @async
 * @param {string} dir - Directory to process recursively
 * @param {string} name - Name for the generated search file (without extension)
 * @returns {Promise<AttemptAsync<string>>} Promise resolving to the path of the generated search file
 * @example
 * ```typescript
 * const searchFile = await generateSearchFile('./src', 'codebase');
 * if (searchFile.isOk()) {
 *   console.log('Search file created at:', searchFile.value);
 * }
 * ```
 */
export const generateSearchFile = (dir: string, name: string) => {
	return attemptAsync(async () => {
		const searchDir = path.join(process.cwd(), 'private', 'searches');
		await fs.promises.mkdir(searchDir, { recursive: true });

		await fs.promises.writeFile(path.join(searchDir, `${name}.search`), '');

		// Generate a streamable file from the tree structure that is easy to search
		// File start is --[fileName:start]--
		// File end is --[fileName:end]--
		// Write contents between these markers and trim the whitespace

		const writable = fs.createWriteStream(path.join(searchDir, `${name}.search`), { flags: 'w' });

		const walk = async (pathname: string) => {
			if (await fs.promises.stat(pathname).then((stat) => stat.isDirectory())) {
				for (const entry of await fs.promises.readdir(pathname)) {
					await walk(path.join(pathname, entry));
				}
			} else {
				const readable = fs.createReadStream(pathname, 'utf-8');

				writable.write(`--[${path.basename(pathname)}:start]--\n`);
				readable.on('data', (chunk) => {
					const content = chunk.toString().trim().replace(/\t/g, '');
					if (content !== '\n') writable.write(content + '\n');
				});

				return new Promise<void>((res, rej) => {
					readable.on('end', () => {
						writable.write(`\n--[${path.basename(pathname)}:end]--\n`);
						res();
					});
					readable.on('error', (err) => {
						rej(err);
					});
				});
			}
		};

		await walk(dir);
		writable.end();
		return path.join(searchDir, `${name}.search`);
	});
};

/**
 * Represents a search result with location information
 *
 * @typedef {SearchResult}
 */
type SearchResult = {
	/** Name of the file where the match was found */
	filename: string;
	/** Line number where the match occurred (0 for filename matches) */
	line: number;
	/** Content of the line containing the match */
	content: string;
	/** Array of [start, end] positions for each match in the content */
	locations: [number, number][];
};

/**
 * Configuration options for search operations
 *
 * @typedef {SearchConfig}
 */
type SearchConfig = {
	/** Maximum number of results to return */
	limit?: number;
	/** Number of results to skip */
	offset?: number;
	/** Whether search should be case sensitive */
	caseSensitive?: boolean;
};

/**
 * Searches through a generated search file for occurrences of a term.
 * Parses the special file markers and returns detailed match information.
 *
 * @export
 * @async
 * @param {string} searchFile - Name of the search file (without .search extension)
 * @param {string} searchTerm - Term to search for
 * @param {SearchConfig} [config] - Search configuration options
 * @returns {Promise<AttemptAsync<SearchResult[]>>} Promise resolving to array of search results
 * @example
 * ```typescript
 * const results = await searchFile('codebase', 'function', {
 *   limit: 10,
 *   caseSensitive: true
 * });
 * if (results.isOk()) {
 *   console.log('Found matches:', results.value);
 * }
 * ```
 */
export const searchFile = (searchFile: string, searchTerm: string, config?: SearchConfig) => {
	return attemptAsync(async () => {
		const { limit, offset = 0, caseSensitive = false } = config ?? {};
		const filePath = path.resolve(process.cwd(), 'private', 'searches', `${searchFile}.search`);
		const readable = fs.createReadStream(filePath, { encoding: 'utf-8' });

		const results: SearchResult[] = [];
		let currentFile: string | null = null;
		let lineNumber = 0;
		let buffer = '';
		let matchesFound = 0;

		const locateAll = (line: string): [number, number][] => {
			const locations: [number, number][] = [];
			const source = caseSensitive ? line : line.toLowerCase();
			const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

			let idx = 0;
			while ((idx = source.indexOf(term, idx)) !== -1) {
				locations.push([idx, idx + term.length]);
				idx += term.length;
			}
			return locations;
		};

		return new Promise<SearchResult[]>((res, rej) => {
			readable.on('data', (chunk) => {
				buffer += chunk;
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (line.startsWith('--[') && line.endsWith(':start]--')) {
						currentFile = line.slice(3, -9);
						lineNumber = 0;

						const locations = locateAll(currentFile);
						if (locations.length > 0) {
							if (matchesFound >= offset) {
								results.push({
									filename: currentFile,
									line: 0,
									content: currentFile,
									locations
								});
							}
							matchesFound++;
						}
					} else if (line.startsWith('--[') && line.endsWith(':end]--')) {
						currentFile = null;
						lineNumber = 0;
					} else {
						lineNumber++;
						const locations = locateAll(line);
						if (locations.length > 0) {
							if (matchesFound >= offset) {
								results.push({
									filename: currentFile ?? 'unknown',
									line: lineNumber,
									content: line.trim(),
									locations
								});
							}
							matchesFound++;

							if (limit !== undefined && results.length >= limit) {
								readable.destroy();
								return res(results);
							}
						}
					}
				}
			});

			readable.on('end', () => {
				if (buffer.length > 0) {
					const locations = locateAll(buffer);
					if (locations.length > 0) {
						matchesFound++;
						if (matchesFound > offset) {
							results.push({
								filename: currentFile ?? 'unknown',
								line: lineNumber + 1,
								content: buffer.trim(),
								locations
							});
						}
					}
				}
				res(results);
			});

			readable.on('error', rej);
		});
	});
};

/**
 * Configuration options for HTML rendering of search results
 *
 * @typedef {HtmlRenderConfig}
 */
type HtmlRenderConfig = {
	/** CSS class for highlighted text (default: "highlight") */
	highlightClass?: string;
	/** HTML tag to wrap highlighted text (default: "span") */
	wrapTag?: string;
	/** Whether to show filename in output (default: false) */
	showFilename?: boolean;
	/** Whether to show line number in output (default: false) */
	showLineNumber?: boolean;
};

/**
 * Escapes HTML special characters in a string
 *
 * @private
 * @param {string} str - String to escape
 * @returns {string} HTML-escaped string
 */
const escapeHtml = (str: string): string =>
	str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

/**
 * Renders a search result as HTML with highlighted matches.
 * Wraps matched terms in configurable HTML tags and optionally shows file/line information.
 *
 * @export
 * @param {SearchResult} result - Search result to render
 * @param {HtmlRenderConfig} [config={}] - Rendering configuration options
 * @returns {string} HTML string with highlighted matches
 * @example
 * ```typescript
 * const html = renderSearchResultHtml(result, {
 *   highlightClass: 'match',
 *   wrapTag: 'mark',
 *   showFilename: true
 * });
 * ```
 */
export const renderSearchResultHtml = (
	result: SearchResult,
	config: HtmlRenderConfig = {}
): string => {
	const {
		highlightClass = 'highlight',
		wrapTag = 'span',
		showFilename = false,
		showLineNumber = false
	} = config;

	const { content, locations, filename, line } = result;

	if (locations.length === 0) {
		return escapeHtml(content);
	}

	// Ensure locations are sorted and non-overlapping
	const sorted = [...locations].sort((a, b) => a[0] - b[0]);

	let output = '';
	let cursor = 0;

	for (const [start, end] of sorted) {
		if (cursor < start) {
			output += escapeHtml(content.slice(cursor, start));
		}
		output += `<${wrapTag} class="${highlightClass}">${escapeHtml(
			content.slice(start, end)
		)}</${wrapTag}>`;
		cursor = end;
	}

	output += escapeHtml(content.slice(cursor));

	if (showFilename || showLineNumber) {
		let meta = '';
		if (showFilename) meta += `<strong>${escapeHtml(filename)}</strong>`;
		if (showLineNumber) meta += ` <em>(line ${line})</em>`;
		return `<div>${meta}<br>${output}</div>`;
	}

	return output;
};

/**
 * Parses a JSON string with comment support and validates it against a Zod schema.
 * Uses comment-json parser to handle JSON with comments.
 *
 * @export
 * @template T
 * @param {string} json - JSON string to parse (may contain comments)
 * @param {z.ZodType<T>} parser - Zod schema to validate the parsed data
 * @returns {Attempt<T>} Result containing parsed and validated data
 * @example
 * ```typescript
 * const userSchema = z.object({ name: z.string(), age: z.number() });
 * const result = parseJSON(jsonString, userSchema);
 * if (result.isOk()) {
 *   console.log('Valid user:', result.value);
 * }
 * ```
 */
export const parseJSON = <T>(json: string, parser: z.ZodType<T>) => {
	return attempt(() => {
		const parsed = parse(json, null, true);
		return parser.parse(parsed);
	});
};

/**
 * Synchronously reads and parses a JSON file with Zod validation.
 * Supports JSON files with comments.
 *
 * @export
 * @template T
 * @param {string} filePath - Path to the JSON file
 * @param {z.ZodType<T>} parser - Zod schema to validate the data
 * @returns {Attempt<T>} Result containing parsed and validated data
 * @example
 * ```typescript
 * const config = openJSONSync('./config.json', configSchema);
 * if (config.isOk()) {
 *   console.log('Configuration loaded:', config.value);
 * }
 * ```
 */
export const openJSONSync = <T>(filePath: string, parser: z.ZodType<T>) => {
	return attempt<T>(() => {
		const raw = fs.readFileSync(filePath, 'utf-8');
		return parseJSON(raw, parser).unwrap();
	});
};

/**
 * Asynchronously reads and parses a JSON file with Zod validation.
 * Supports JSON files with comments.
 *
 * @export
 * @template T
 * @param {string} filePath - Path to the JSON file
 * @param {z.ZodType<T>} parser - Zod schema to validate the data
 * @returns {Promise<AttemptAsync<T>>} Promise resolving to parsed and validated data
 * @example
 * ```typescript
 * const config = await openJSON('./config.json', configSchema);
 * if (config.isOk()) {
 *   console.log('Configuration loaded:', config.value);
 * }
 * ```
 */
export const openJSON = <T>(filePath: string, parser: z.ZodType<T>) => {
	return attemptAsync<T>(async () => {
		const raw = await fs.promises.readFile(filePath, 'utf-8');
		return parseJSON(raw, parser).unwrap();
	});
};
