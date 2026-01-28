import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import { spawn } from 'child_process';
import terminal from '../src/lib/server/utils/terminal';

const run = (command: string, args: string[], cwd: string) => {
	return new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: 'inherit'
		});

		child.on('error', (error) => reject(error));
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
		});
	});
};

const runCapture = (command: string, args: string[], cwd: string) => {
	return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
		const child = spawn(command, args, {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (data) => {
			const text = data.toString();
			stdout += text;
			process.stdout.write(text);
		});

		child.stderr.on('data', (data) => {
			const text = data.toString();
			stderr += text;
			process.stderr.write(text);
		});

		child.on('close', (code) => {
			resolve({ code: code ?? 0, stdout, stderr });
		});
	});
};

const titleFromPath = (relativePath: string) => {
	const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
	const base = parts[0] ?? 'Docs';
	return base
		.split(/[-_ ]+/)
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');
};

const extractTitleFromMarkdown = (content: string, fallback: string) => {
	const lines = content.split(/\r?\n/);
	for (const line of lines) {
		if (line.startsWith('# ')) {
			return line.replace(/^#\s+/, '').trim();
		}
	}
	return fallback;
};

const stripFirstHeading = (content: string) => {
	const lines = content.split(/\r?\n/);
	const index = lines.findIndex((line) => line.startsWith('# '));
	if (index === -1) return content;
	return [...lines.slice(0, index), ...lines.slice(index + 1)].join('\n').trimStart();
};

const sanitizeMdx = (content: string) => {
	return content.replace(/<script-name>/g, '&lt;script-name&gt;');
};

const parseTscErrors = (output: string, root: string) => {
	const files = new Set<string>();
	const regex = /^(.+?):\d+:\d+ - error TS\d+:/gm;
	for (const match of output.matchAll(regex)) {
		let filePath = match[1].trim();
		if (path.isAbsolute(filePath)) {
			filePath = path.relative(root, filePath);
		}
		files.add(filePath.replace(/\\/g, '/'));
	}
	return Array.from(files);
};

const createDocFile = async (filePath: string, title: string, content: string, slug?: string) => {
	const frontmatter = [
		'---',
		`title: ${title}`,
		slug ? `slug: ${slug}` : undefined,
		'---',
		''
	]
		.filter(Boolean)
		.join('\n');

	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, `${frontmatter}\n${content.trim()}\n`);
};

export default async () => {
	const root = process.cwd();
	const docsSiteRoot = path.join(root, 'docs');
	const docsContentRoot = path.join(docsSiteRoot, 'docs');
	const tmpRoot = path.join(root, '.docs-tmp');
	const apiMdRoot = path.join(docsContentRoot, 'api');
	const outRoot = path.join(docsSiteRoot, 'dist');

	await fs.rm(tmpRoot, { recursive: true, force: true });
	await fs.rm(docsContentRoot, { recursive: true, force: true });
	await fs.mkdir(tmpRoot, { recursive: true });
	await fs.mkdir(docsContentRoot, { recursive: true });
	await fs.mkdir(apiMdRoot, { recursive: true });

	const docsTsconfig = path.join(tmpRoot, 'tsconfig.docs.json');
	await fs.writeFile(
		docsTsconfig,
		JSON.stringify(
			{
				compilerOptions: {
					target: 'ES2022',
					module: 'ESNext',
					moduleResolution: 'Bundler',
					allowJs: true,
					checkJs: false,
					esModuleInterop: true,
					resolveJsonModule: true,
					skipLibCheck: true,
					noImplicitAny: false,
					strict: false
				},
				include: ['../src/**/*.ts', '../src/**/*.d.ts', '../cli/**/*.ts', '../scripts/**/*.ts'],
				exclude: [
					'../**/node_modules/**',
					'../**/.svelte-kit/**',
					'../**/build/**',
					'../**/test-results/**'
				]
			},
			null,
			2
		)
	);

	terminal.log('Scanning TypeScript errors for docs...');
	const tscResult = await runCapture(
		'pnpm',
		['exec', 'tsc', '--noEmit', '--pretty', 'false', '-p', docsTsconfig],
		root
	);
	const errorFiles = parseTscErrors(tscResult.stdout + tscResult.stderr, root);
	if (errorFiles.length > 0) {
		terminal.warn(`Skipping ${errorFiles.length} files with TypeScript errors.`);
		for (const file of errorFiles) {
			terminal.warn(`- ${file}`);
		}
	}

	terminal.log('Generating API markdown with TypeDoc...');
	try {
		const typedocArgs = [
			'exec',
			'typedoc',
			'--plugin',
			'typedoc-plugin-markdown',
			'--out',
			apiMdRoot,
			'--entryPoints',
			'src',
			'--entryPointStrategy',
			'expand',
			'--readme',
			'none',
			'--tsconfig',
			docsTsconfig,
			'--skipErrorChecking'
		];
		for (const file of errorFiles) {
			typedocArgs.push('--exclude', file);
		}
		await run('pnpm', typedocArgs, root);
	} catch (error) {
		terminal.warn(
			`TypeDoc failed; continuing without API docs. ${error instanceof Error ? error.message : error}`
		);
	}

	terminal.log('Generating Markdown pages from README files...');
	const readmeFiles = await glob('**/README.md', {
		cwd: root,
		ignore: [
			'**/node_modules/**',
			'**/docs/**',
			'**/docs-site/**',
			'**/.docs-tmp/**',
			'**/build/**',
			'**/test-results/**',
			'**/.git/**'
		]
	});

	for (const rel of readmeFiles.sort()) {
		const abs = path.join(root, rel);
		const dir = path.dirname(rel).replace(/\\/g, '/');
		const raw = await fs.readFile(abs, 'utf-8');
		const title = extractTitleFromMarkdown(raw, titleFromPath(rel === 'README.md' ? 'Docs' : dir));
		const content = sanitizeMdx(stripFirstHeading(raw));

		if (rel === 'README.md') {
			await createDocFile(path.join(docsContentRoot, 'intro.md'), title, content, '/');
			continue;
		}

		await createDocFile(path.join(docsContentRoot, dir, 'index.md'), title, content);
	}

	terminal.log('Building Docusaurus site...');
	await fs.rm(outRoot, { recursive: true, force: true });
	await run(
		'pnpm',
		[
			'exec',
			'docusaurus',
			'build',
			'--config',
			path.join(docsSiteRoot, 'docusaurus.config.cjs'),
			'--out-dir',
			outRoot
		],
		root
	);

	terminal.log(`Docs build complete. Output in ${outRoot}`);
	return true;
};
