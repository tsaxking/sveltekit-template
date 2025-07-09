import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';

// Recursively render Markdown files
const renderMarkdowns = (src: string, dest: string) => {
	const md = new MarkdownIt();

	if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

	for (const file of fs.readdirSync(src)) {
		const srcPath = path.join(src, file);
		const destPath = path.join(dest, file.replace(/\.md$/, '.html'));

		const stat = fs.statSync(srcPath);

		if (stat.isDirectory()) {
			renderMarkdowns(srcPath, path.join(dest, file));
		} else if (file.endsWith('.md')) {
			const markdown = fs.readFileSync(srcPath, 'utf-8');
			const html = md.render(markdown);

			// Add a basic HTML wrapper
			fs.writeFileSync(
				destPath,
				`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${file}</title></head><body>${html}</body></html>`
			);
		}
	}
};

export default () => {
	const docsDir = path.resolve(process.cwd(), './docs');
	const outDir = path.resolve(process.cwd(), './gh-pages');

	if (!fs.existsSync(docsDir)) {
		console.error(`Docs directory not found: ${docsDir}`);
		return;
	}

	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	console.log(`Rendering Markdown files from ${docsDir} to ${outDir}`);
	renderMarkdowns(docsDir, outDir);
	console.log('Rendering complete.');
};
