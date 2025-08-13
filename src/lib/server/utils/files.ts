import path from 'path';
import fs from 'fs';
import { attemptAsync } from 'ts-utils/check';


export type FileTree = {
	name: string;
	children?: FileTree[];
	path: string;
	type: 'directory' | 'file';
	fullPath: string;
};

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

type SearchResult = {
	filename: string;
	line: number;
	content: string;
	locations: [number, number][];
};

type SearchConfig = {
	limit?: number;
	offset?: number;
	caseSensitive?: boolean;
};

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

type HtmlRenderConfig = {
	highlightClass?: string; // default: "highlight"
	wrapTag?: string; // default: "span"
	showFilename?: boolean; // default: false
	showLineNumber?: boolean; // default: false
};

const escapeHtml = (str: string): string =>
	str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

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
