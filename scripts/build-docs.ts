import { render } from 'html-constructor';
import fs from 'fs/promises';
import path from 'path';
import { repoName, repoSlug } from '../src/lib/server/utils/git';
import { sync } from 'glob';

export default async () => {
	const html = await fs.readFile(path.join(process.cwd(), 'docs', 'index.template.html'), 'utf-8');

	const projectName = await repoName().unwrap();
	const repositorySlug = await repoSlug().unwrap();

	const renderedHtml = render(html, {
		projectName,
		repoSlug: repositorySlug
	});

	await fs.writeFile(path.join(process.cwd(), 'docs', 'index.html'), renderedHtml, 'utf-8');

	const files = sync('docs/**/*.md');
	files.push('docs/.github/index.md');
	const index: {
		title: string;
		path: string;
		content: string;
	}[] = [];
	const dirs = new Set<string>();
	for (const file of files) {
		const content = await fs.readFile(file, 'utf-8');

		const titleMatch = content.match(/^# (.+)$/m);
		const title = titleMatch ? titleMatch[1] : path.basename(file);

		index.push({
			title,
			path: file.replace('docs/', '').replace('.md', ''),
			content: content.slice(0, 500) // Limit content snippet
		});
		const dir = path.dirname(file);
		dirs.add(dir);
	}

	await fs.writeFile('docs/search-index.json', JSON.stringify(index, null, 2));

	// Put an empty _sidebar.md and _navbar.md in every directory within docs/

	// Write empty _sidebar.md and _navbar.md in each dir
	await Promise.all(
		[...dirs].map(async (dir) => {
			const sidebarPath = path.join(dir, '_sidebar.md');
			const navbarPath = path.join(dir, '_navbar.md');

			// Only write if not exists (in case user has a .gitignored empty file already)
			try {
				await fs.access(sidebarPath);
			} catch {
				await fs.writeFile(sidebarPath, '');
			}

			try {
				await fs.access(navbarPath);
			} catch {
				await fs.writeFile(navbarPath, '');
			}
		})
	);
};
