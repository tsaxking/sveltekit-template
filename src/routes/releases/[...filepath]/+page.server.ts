import fs from 'fs/promises';
import path from 'path';
import { fileTree, renderSearchResultHtml, searchFile } from '$lib/server/utils/files.js';
import { fail } from '@sveltejs/kit';

export const load = async (event) => {
	const md = await fs.readFile(
		path.join(process.cwd(), 'private', 'releases', event.params.filepath + '/index.md'),
		'utf-8'
	);

	const tree = await fileTree(path.join(process.cwd(), 'private', 'releases'));

	if (tree.isErr()) {
		throw fail(500);
	}

	return {
		md,
		tree: tree.value
	};
};

export const actions = {
	search: async (event) => {
		const data = (await event.request.formData()).get('search');
		if (!data) throw fail(400, { message: 'Search term is required' });

		const searchTerm = data.toString();

		const results = await searchFile('releases', searchTerm).unwrap();

		return {
			results: results.map((r) => ({
				...r,
				html: renderSearchResultHtml(r, {
					wrapTag: 'span',
					highlightClass: 'text-primary',
					showLineNumber: true
					// showFilename: true,
				})
			}))
		};
	}
};
