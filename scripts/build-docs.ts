import { render } from 'html-constructor';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { repoName, repoSlug } from '../src/lib/server/utils/git';
import { sync } from 'glob';
config();

export default async () => {
	const html = await fs.readFile(path.join(process.cwd(), 'docs', 'index.template.html'), 'utf-8');

	const renderedHtml = render(html, {
		projectName: process.env.PUBLIC_APP_NAME || (await repoName().unwrap()),
		repoSlug: await repoSlug().unwrap()
	});

	await fs.writeFile(path.join(process.cwd(), 'docs', 'index.html'), renderedHtml, 'utf-8');

	const files = sync('docs/**/*.md');
	const index: {
		title: string;
		path: string;
		content: string;
	}[] = [];
	for (const file of files) {
		const content = await fs.readFile(file, 'utf-8');
		const titleMatch = content.match(/^# (.+)$/m);
		const title = titleMatch ? titleMatch[1] : path.basename(file);

		index.push({
			title,
			path: file.replace('docs/', '').replace('.md', ''),
			content: content.slice(0, 500) // Limit content snippet
		});
	}

	await fs.writeFile('docs/search-index.json', JSON.stringify(index, null, 2));
};
