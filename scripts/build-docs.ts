import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import terminal from '../src/lib/server/utils/terminal';
import { runTask } from '../src/lib/server/utils/task';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const NOTES_DIR = path.join(DOCS_DIR, 'notes');
const API_DIR = path.join(DOCS_DIR, 'api');
const DOCS_TSCONFIG = path.join(ROOT, 'tsconfig.docs.json');
const SIDEBAR_FILE = path.join(DOCS_DIR, '.vitepress', 'sidebar.generated.ts');

const normalizeSlashes = (value: string) => value.split(path.sep).join('/');

const titleFromPath = (relativePath: string) => {
	const base = path.basename(relativePath, '.md');
	const fallback =
		base.toLowerCase() === 'readme' ? path.basename(path.dirname(relativePath)) : base;
	const safe = fallback && fallback !== '.' ? fallback : 'README';
	return safe.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
};

const ensureDir = async (dir: string) => {
	await fs.mkdir(dir, { recursive: true });
};

const ensureFrontmatter = (content: string, title: string) => {
	if (content.trimStart().startsWith('---')) {
		return content;
	}
	return `---\ntitle: ${title}\n---\n\n${content}`;
};

const sanitizeSegment = (segment: string) => segment.replace(/\[/g, '__').replace(/\]/g, '__');

const sanitizePath = (value: string) =>
	value
		.split(path.sep)
		.map((segment) => sanitizeSegment(segment))
		.join(path.sep);

const renameDynamicSegments = async (rootDir: string) => {
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	for (const entry of entries) {
		const currentPath = path.join(rootDir, entry.name);
		const sanitizedName = sanitizeSegment(entry.name);
		let nextPath = currentPath;

		if (sanitizedName !== entry.name) {
			nextPath = path.join(rootDir, sanitizedName);
			await fs.rename(currentPath, nextPath);
		}

		if (entry.isDirectory()) {
			await renameDynamicSegments(nextPath);
		}
	}
};

const sanitizeMarkdownLinks = (content: string) => {
	return content.replace(/\]\(([^)]+)\)/g, (match, url) => {
		const sanitizedUrl = sanitizePath(url);
		return match.replace(url, sanitizedUrl);
	});
};

type SidebarNode = {
	name: string;
	children: Map<string, SidebarNode>;
	link?: string;
};

const createNode = (name: string): SidebarNode => ({
	name,
	children: new Map()
});

const titleize = (value: string) =>
	value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const buildTree = (paths: string[], base: string) => {
	const root = createNode(base);

	for (const relPath of paths) {
		const parts = relPath.split('/').filter(Boolean);
		let current = root;
		for (let i = 0; i < parts.length; i += 1) {
			const part = parts[i];
			const isLeaf = i === parts.length - 1;
			const name = part.replace(/\.md$/, '');
			const isReadme = name.toLowerCase() === 'readme';

			if (isLeaf && isReadme) {
				const prefix = parts
					.slice(0, i)
					.map((p) => p.replace(/\.md$/, ''))
					.join('/');
				const link = prefix ? `/${base}/${prefix}/` : `/${base}/`;
				current.link = link;
				continue;
			}

			if (!current.children.has(name)) {
				current.children.set(name, createNode(name));
			}

			current = current.children.get(name)!;
			if (isLeaf) {
				current.link = `/${base}/${parts.map((p) => p.replace(/\.md$/, '')).join('/')}`.replace(
					/\/$/,
					''
				);
			}
		}
	}

	return root;
};

const toSidebarItems = (node: SidebarNode) => {
	const items = Array.from(node.children.values())
		.filter((child) => child.name.toLowerCase() !== 'readme')
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((child) => {
			const item: { text: string; link?: string; items?: (typeof item)[] } = {
				text: titleize(child.name)
			};
			if (child.link) {
				const needsSlash = child.children.size > 0 && !child.link.endsWith('/');
				item.link = needsSlash ? `${child.link}/` : child.link;
			}
			if (child.children.size > 0) {
				item.items = toSidebarItems(child);
			}
			return item;
		});

	return items;
};

const extractSvelteDoc = (content: string) => {
	const blocks = content.match(/<!--([\s\S]*?)-->/g) ?? [];
	for (const block of blocks) {
		if (!block.includes('@component')) continue;
		const lines = block
			.replace(/^<!--/, '')
			.replace(/-->$/, '')
			.replace(/\r/g, '')
			.split('\n')
			.map((line) => line.trim());

		const filtered = lines.filter((line) => line && !line.startsWith('@component'));
		const body = filtered.join('\n').trim();
		if (body) return body;
	}

	return null;
};

const writeSvelteIndex = async (sectionDir: string, title: string, entries: string[]) => {
	const lines: string[] = ['---', `title: ${title}`, '---', '', `# ${title}`, ''];

	const sorted = [...entries].sort((a, b) => a.localeCompare(b));
	for (const rel of sorted) {
		lines.push(`- [${rel}](./${rel})`);
	}

	await ensureDir(sectionDir);
	await fs.writeFile(path.join(sectionDir, 'README.md'), lines.join('\n'));
};

const generateSvelteDocs = async () => {
	const targets = [
		{ root: path.join(ROOT, 'src', 'lib', 'components'), title: 'Components' },
		{ root: path.join(ROOT, 'src', 'routes'), title: 'Routes (Svelte)' }
	];

	for (const target of targets) {
		let entries: string[] = [];
		try {
			const files = await glob('**/*.svelte', { cwd: target.root, nodir: true });
			entries = [];
			for (const relPath of files) {
				const absPath = path.join(target.root, relPath);
				const content = await fs.readFile(absPath, 'utf-8');
				const doc = extractSvelteDoc(content);
				if (!doc) continue;

				const relNoExt = relPath.replace(/\.svelte$/, '');
				const outputPath = path.join(
					DOCS_DIR,
					'api',
					path.relative(ROOT, absPath).replace(/\.svelte$/, '.md')
				);
				await ensureDir(path.dirname(outputPath));
				const title = titleFromPath(relNoExt);
				const body = ensureFrontmatter(`\n# ${title}\n\n${doc}\n`, title);
				await fs.writeFile(outputPath, body);
				entries.push(relNoExt);
			}
			if (entries.length > 0) {
				const sectionDir = path.join(DOCS_DIR, 'api', path.relative(ROOT, target.root));
				await writeSvelteIndex(sectionDir, target.title, entries);
			}
		} catch {
			// ignore
		}
	}
};

const writeSidebar = async () => {
	const apiFiles = await glob('api/**/*.md', {
		cwd: DOCS_DIR,
		nodir: true,
		ignore: ['api/index.md']
	});
	const notesFiles = await glob('notes/**/*.md', {
		cwd: DOCS_DIR,
		nodir: true,
		ignore: ['notes/index.md']
	});

	const apiTree = buildTree(
		apiFiles.map((p) => p.replace(/^api\//, '')),
		'api'
	);
	const notesTree = buildTree(
		notesFiles.map((p) => p.replace(/^notes\//, '')),
		'notes'
	);

	const sidebar = {
		'/api/': [{ text: 'API', link: '/api/' }, ...toSidebarItems(apiTree)],
		'/notes/': [{ text: 'Notes', link: '/notes/' }, ...toSidebarItems(notesTree)]
	};

	const fileContents = `// Auto-generated by scripts/build-docs.ts\nexport const sidebar = ${JSON.stringify(
		sidebar,
		null,
		2
	)} as const;\n`;

	await ensureDir(path.dirname(SIDEBAR_FILE));
	await fs.writeFile(SIDEBAR_FILE, fileContents);
};

const sanitizeApiDocs = async () => {
	await renameDynamicSegments(API_DIR);
	const markdownFiles = await glob('api/**/*.md', {
		cwd: DOCS_DIR,
		nodir: true
	});

	await Promise.all(
		markdownFiles.map(async (relPath) => {
			const filePath = path.join(DOCS_DIR, relPath);
			const content = await fs.readFile(filePath, 'utf-8');
			const updated = sanitizeMarkdownLinks(content);
			if (updated !== content) {
				await fs.writeFile(filePath, updated);
			}
		})
	);
};

const extractFileOverview = (content: string) => {
	const blocks = content.match(/\/\*\*[\s\S]*?\*\//g) ?? [];
	for (const block of blocks) {
		if (!block.includes('@fileoverview') && !block.includes('@file')) continue;
		const lines = block
			.replace(/\r/g, '')
			.split('\n')
			.map((line) => line.replace(/^\s*\*\s?/, ''));

		const startIndex = lines.findIndex((line) => line.includes('@fileoverview'));
		const fileTagIndex =
			startIndex === -1 ? lines.findIndex((line) => line.includes('@file')) : startIndex;
		if (fileTagIndex === -1) continue;

		const overviewLines: string[] = [];
		const tagLine = lines[fileTagIndex];
		const tagContent = tagLine
			.replace(/.*@fileoverview\s?/, '')
			.replace(/.*@file\s?/, '')
			.trim();
		if (tagContent) overviewLines.push(tagContent);

		for (let i = fileTagIndex + 1; i < lines.length; i += 1) {
			const line = lines[i].trimEnd();
			if (line.trim().startsWith('@')) break;
			overviewLines.push(line);
		}

		const overview = overviewLines
			.map((line) => line.trim())
			.filter(Boolean)
			.join(' ')
			.trim();

		if (overview) return overview;
	}

	return null;
};

const injectFileOverviews = async () => {
	const readmes = await glob('api/**/README.md', {
		cwd: DOCS_DIR,
		nodir: true
	});

	for (const relPath of readmes) {
		const modulePath = relPath.replace(/^api\//, '').replace(/\/README\.md$/, '');
		const possibleFiles = [
			path.join(ROOT, modulePath),
			path.join(ROOT, `${modulePath}.ts`),
			path.join(ROOT, `${modulePath}.js`),
			path.join(ROOT, `${modulePath}.svelte`),
			path.join(ROOT, `${modulePath}.mjs`)
		];

		let sourcePath: string | null = null;
		for (const candidate of possibleFiles) {
			try {
				const stat = await fs.stat(candidate);
				if (stat.isFile()) {
					sourcePath = candidate;
					break;
				}
			} catch {
				// ignore missing files
			}
		}

		if (!sourcePath) continue;

		let overview: string | null = null;
		try {
			overview = extractFileOverview(await fs.readFile(sourcePath, 'utf-8'));
		} catch {
			// ignore read errors
		}

		if (!overview) continue;

		const readmePath = path.join(DOCS_DIR, relPath);
		const readme = await fs.readFile(readmePath, 'utf-8');
		if (readme.includes('## File Overview')) continue;
		if (readme.includes(overview)) continue;

		const headingMatch = readme.match(/^#\s.+$/m);
		if (!headingMatch) continue;
		const heading = headingMatch[0];
		const insertIndex = readme.indexOf(heading) + heading.length;
		const updated =
			readme.slice(0, insertIndex) +
			`\n\n## File Overview\n\n${overview}\n` +
			readme.slice(insertIndex);
		await fs.writeFile(readmePath, updated);
	}
};

const writeNotesIndex = async (notePaths: string[]) => {
	const lines: string[] = [
		'---',
		'title: Notes',
		'---',
		'',
		'# Notes',
		'',
		'All Markdown files collected from the repository.'
	];

	const sorted = [...notePaths].sort((a, b) => a.localeCompare(b));
	for (const relPath of sorted) {
		const label = relPath.replace(/\.md$/, '');
		const link = `./${label}`;
		lines.push(`- [${label}](${link})`);
	}

	await ensureDir(NOTES_DIR);
	await fs.writeFile(path.join(NOTES_DIR, 'index.md'), lines.join('\n'));
};

const writeApiIndex = async () => {
	const apiFiles = await glob('api/**/*.md', {
		cwd: DOCS_DIR,
		ignore: ['api/index.md'],
		nodir: true
	});

	const lines: string[] = [
		'---',
		'title: API Reference',
		'---',
		'',
		'# API Reference',
		'',
		'Generated API documentation.'
	];

	const sorted = apiFiles.sort((a, b) => a.localeCompare(b));
	for (const file of sorted) {
		const rel = file.replace(/^api\//, '').replace(/\.md$/, '');
		lines.push(`- [${rel}](./${rel})`);
	}

	await fs.writeFile(path.join(API_DIR, 'index.md'), lines.join('\n'));
};

const ensureApiIndexes = async () => {
	const readmes = await glob('api/**/README.md', {
		cwd: DOCS_DIR,
		nodir: true
	});

	await Promise.all(
		readmes.map(async (relPath) => {
			const readmePath = path.join(DOCS_DIR, relPath);
			const indexPath = path.join(path.dirname(readmePath), 'index.md');
			try {
				await fs.access(indexPath);
				return;
			} catch {
				// continue to write
			}
			const content = await fs.readFile(readmePath, 'utf-8');
			await fs.writeFile(indexPath, content);
		})
	);
};

const copyMarkdownFiles = async () => {
	const ignore = [
		'**/node_modules/**',
		'**/build/**',
		'**/.svelte-kit/**',
		'**/docs/**',
		'**/dist/**',
		'**/test-results/**',
		'**/tmp/**',
		'**/private/**',
		'**/drizzle/**',
		'**/static/**',
		'**/logs/**'
	];

	const markdownFiles = await glob('**/*.md', {
		cwd: ROOT,
		ignore,
		nodir: true
	});

	const copied: string[] = [];

	for (const relPath of markdownFiles) {
		const sourcePath = path.join(ROOT, relPath);
		const targetPath = path.join(NOTES_DIR, relPath);
		await ensureDir(path.dirname(targetPath));
		const content = await fs.readFile(sourcePath, 'utf-8');
		const title = titleFromPath(relPath);
		await fs.writeFile(targetPath, ensureFrontmatter(content, title));
		copied.push(normalizeSlashes(relPath));
	}

	await writeNotesIndex(copied);

	return copied.length;
};

const writeHomeFromReadme = async () => {
	const readmePath = path.join(ROOT, 'README.md');
	try {
		const content = await fs.readFile(readmePath, 'utf-8');
		const titled = ensureFrontmatter(content, 'Home');
		await fs.writeFile(path.join(DOCS_DIR, 'index.md'), titled);
	} catch {
		// If no README exists, keep the existing index.md
	}
};

const buildApiDocs = async () => {
	const result = await runTask(
		'pnpm',
		'exec',
		'typedoc',
		'--plugin',
		'typedoc-plugin-markdown',
		'--out',
		API_DIR,
		'--tsconfig',
		DOCS_TSCONFIG,
		'--skipErrorChecking',
		'--entryPoints',
		'src',
		'cli',
		'scripts',
		'--entryPointStrategy',
		'expand',
		'--readme',
		'none'
	);

	if (result.isErr()) {
		await terminal.error(result.error);
		return result;
	}

	await generateSvelteDocs();
	await sanitizeApiDocs();
	await ensureApiIndexes();
	await writeApiIndex();
	await injectFileOverviews();

	return result;
};

const buildSite = async () => {
	const result = await runTask('pnpm', 'exec', 'vitepress', 'build', 'docs');

	if (result.isErr()) {
		await terminal.error(result.error);
		return result;
	}

	return result;
};

const ensureVitepressScaffold = async (vitepressDir: string) => {
	const configPath = path.join(vitepressDir, 'config.ts');
	const themeDir = path.join(vitepressDir, 'theme');
	const themeIndex = path.join(themeDir, 'index.ts');
	const themeCss = path.join(themeDir, 'custom.css');

	await ensureDir(vitepressDir);
	await ensureDir(themeDir);

	try {
		await fs.access(configPath);
	} catch {
		const configContents = `import { defineConfig } from 'vitepress';
import { sidebar } from './sidebar.generated';

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = repoName ? '/' + repoName + '/' : '/docs/.vitepress/dist/';
const useRelativeLinks = base.startsWith('./');

type SidebarItem = {
	text: string;
	link?: string;
	items?: SidebarItem[];
};

const normalizeLink = (link?: string) => {
	if (!link) return link;
	if (link.startsWith('http://') || link.startsWith('https://')) return link;
	if (useRelativeLinks) {
		if (link === '/') return './';
		return link.replace(/^\\//, './');
	}
	return link;
};

const normalizeItems = (items?: SidebarItem[]): SidebarItem[] | undefined => {
	if (!items) return items;
	return items.map((item) => ({
		...item,
		link: normalizeLink(item.link),
		items: normalizeItems(item.items)
	}));
};

const normalizedSidebar = Object.fromEntries(
	Object.entries(sidebar).map(([key, items]) => [key, normalizeItems(items as SidebarItem[])])
);

export default defineConfig({
	base,
	appearance: 'dark',
	title: 'Project Docs',
	description: 'Generated documentation from JSDoc and Markdown',
	cleanUrls: false,
	markdown: {
		html: false
	},
	ignoreDeadLinks: true,
	themeConfig: {
		nav: [
			{ text: 'Home', link: normalizeLink('/') },
			{ text: 'API', link: normalizeLink('/api/') },
			{ text: 'Notes', link: normalizeLink('/notes/') }
		],
		search: {
			provider: 'local'
		},
		sidebar: normalizedSidebar
	}
});
`;
		await fs.writeFile(configPath, configContents);
	}

	try {
		await fs.access(themeIndex);
	} catch {
		await fs.writeFile(
			themeIndex,
			`import DefaultTheme from 'vitepress/theme';\nimport './custom.css';\n\nexport default {\n\t...DefaultTheme,\n\tenhanceApp(ctx) {\n\t\tDefaultTheme.enhanceApp?.(ctx);\n\t}\n};\n`
		);
	}

	try {
		await fs.access(themeCss);
	} catch {
		await fs.writeFile(
			themeCss,
			`:root {\n\t--vp-c-brand-1: #60a5fa;\n\t--vp-c-brand-2: #3b82f6;\n\t--vp-c-brand-3: #2563eb;\n\t--vp-c-brand-soft: rgba(96, 165, 250, 0.16);\n\t--vp-c-bg: #0b0f17;\n\t--vp-c-bg-alt: #0f172a;\n\t--vp-c-bg-soft: #111827;\n\t--vp-c-bg-soft-up: #1f2937;\n\t--vp-c-border: #1f2937;\n\t--vp-c-divider: #1f2937;\n\t--vp-c-text-1: #e5e7eb;\n\t--vp-c-text-2: #9ca3af;\n\t--vp-c-text-3: #6b7280;\n\t--vp-code-block-bg: #0f172a;\n}\n\nhtml {\n\tcolor-scheme: dark;\n}\n\n.VPNavBar .VPNavBarTitle {\n\tfont-weight: 700;\n}\n\n.VPHome .VPHomeHero .name {\n\tletter-spacing: -0.02em;\n}\n\n.VPHome .VPHomeHero .text {\n\tmax-width: 52rem;\n}\n\n.VPContent h1,\n.VPContent h2,\n.VPContent h3 {\n\tletter-spacing: -0.015em;\n}\n\n.VPSidebarItem .text {\n\tline-height: 1.4;\n}\n\n.VPNavBar {\n\tbackdrop-filter: blur(12px);\n}\n\n.VPButton.brand {\n\tbox-shadow: 0 10px 30px rgba(37, 99, 235, 0.2);\n}\n`
		);
	}
};

export default async () => {
	const vitepressDir = path.join(DOCS_DIR, '.vitepress');

	await fs.rm(path.join(vitepressDir, 'dist'), { recursive: true, force: true });
	await fs.rm(API_DIR, { recursive: true, force: true });
	await fs.rm(NOTES_DIR, { recursive: true, force: true });
	await fs.rm(path.join(DOCS_DIR, 'index.md'), { force: true });
	await fs.rm(path.join(vitepressDir, 'sidebar.generated.ts'), { force: true });

	await ensureDir(DOCS_DIR);
	await ensureVitepressScaffold(vitepressDir);
	await ensureDir(API_DIR);
	await ensureDir(NOTES_DIR);

	terminal.log('Collecting Markdown files...');
	const count = await copyMarkdownFiles();
	await terminal.log(`Collected ${count} Markdown file(s).`);
	await writeHomeFromReadme();

	terminal.log('Generating API docs from JSDoc/TypeScript...');
	const apiResult = await buildApiDocs();
	if (apiResult.isErr()) {
		return apiResult;
	}

	terminal.log('Generating Copilot instructions...');
	terminal.log('Building static site...');
	await writeSidebar();
	const siteResult = await buildSite();

	if (siteResult.isErr()) {
		return siteResult;
	}

	return 'Docs build complete: docs/.vitepress/dist';
};
