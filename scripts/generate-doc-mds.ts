/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { fileTree, type FileTree } from '../src/lib/server/utils/files';
import ts from 'typescript';
import { Application } from 'typedoc';

const toPosix = (p: string) => p.split(path.sep).join('/');

const loadIgnore = (root: string) => {
	const ig = ignore();
	const dockignorePath = path.join(root, '.docignore');
	if (fs.existsSync(dockignorePath)) {
		// console.log(`Loading .docignore from: ${dockignorePath}`);
		const content = fs.readFileSync(dockignorePath, 'utf8');
		ig.add(content);
	} else {
		console.log(`No .docignore found in: ${root}`);
	}
	return ig;
};

type JsDocTag = {
	tagName: string;
	paramName?: string;
	type?: string;
	comment?: string;
};

/**
 * Extracts Markdown documentation from a TypeScript file's JSDoc comments.
 * @param filePath Full path to the .ts file.
 * @returns Markdown string.
 */
export const generateMarkdownFromFile = async (filePath: string): Promise<string> => {
	if (!filePath.endsWith('.ts')) {
		return '';
	}
	const content = await fs.promises.readFile(filePath, 'utf-8');
	const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

	let mdContent = `# ${filePath.split('/').pop()}\n\n`;

	const visit = (node: ts.Node) => {
		if (
			ts.canHaveModifiers(node) &&
			ts.getModifiers(node)?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
		) {
			const name = (node as any).name?.getText() || '(anonymous)';

			const jsDocs = ts
				.getJSDocCommentsAndTags(node)
				.map((doc) => doc.getText())
				.join('\n')
				.trim();

			if (jsDocs) {
				mdContent += `## ${name}\n\n`;
				mdContent += `\`\`\`ts\n${node.getText()}\n\`\`\`\n\n`;

				// Extract structured tags
				const structuredTags: JsDocTag[] = [];
				const jsDocNodes = (node as any).jsDoc || [];

				for (const docNode of jsDocNodes) {
					if (docNode.tags) {
						for (const tag of docNode.tags) {
							const tagName = tag.tagName.escapedText;
							const paramName = tag.name?.escapedText;
							const comment = tag.comment;
							structuredTags.push({ tagName, paramName, comment });
						}
					}
				}

				// Description (non-tag text)
				const description = jsDocs.split('@')[0].replace('/**', '').replace('*/', '').trim();
				if (description) {
					mdContent += `${description}\n\n`;
				}

				// Parameters Table
				const params = structuredTags.filter((t) => t.tagName === 'param');
				if (params.length) {
					mdContent += `**Parameters:**\n\n| Name | Description |\n|------|-------------|\n`;
					for (const param of params) {
						mdContent += `| ${param.paramName} | ${param.comment || ''} |\n`;
					}
					mdContent += '\n';
				}

				// Returns
				const returns = structuredTags.find(
					(t) => t.tagName === 'returns' || t.tagName === 'return'
				);
				if (returns) {
					mdContent += `**Returns:**\n\n${returns.comment || ''}\n\n`;
				}

				// Example
				const example = structuredTags.find((t) => t.tagName === 'example');
				if (example) {
					mdContent += `**Example:**\n\n\`\`\`ts\n${example.comment}\n\`\`\`\n\n`;
				}
			}
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);

	return mdContent;
};

export const generateMarkdownWithTypeDoc = async (filePath: string): Promise<string> => {
	try {
		const app = await Application.bootstrap({
			entryPoints: [filePath],
			plugin: ['typedoc-plugin-markdown'],
			exclude: ['**/*.d.ts'],
			excludeExternals: true,
			excludePrivate: true,
			excludeProtected: true,
			// hideBreadcrumbs: true,
			// hidePageTitle: true,
			logLevel: 'Error'
		});

		const project = await app.convert();

		if (!project) {
			throw new Error('TypeDoc failed to parse project.');
		}

		const outDir = './.tmp-typedoc';
		await app.generateDocs(project, outDir);

		const mdFiles = await fs.promises.readdir(outDir);
		if (mdFiles.length === 0) {
			throw new Error('No Markdown files generated.');
		}

		const mdContent = await fs.promises.readFile(path.join(outDir, mdFiles[0]), 'utf-8');

		// Clean up tmp files
		await fs.promises.rm(outDir, { recursive: true, force: true });

		return mdContent;
	} catch (error) {
		console.error(error);
		return '';
	}
};

export default async (...args: string[]) => {
	const doAppend = args.includes('--append');
	const target = 'docs';
	const rootDir = process.cwd();
	const targetDir = path.join(rootDir, target);
	const tree = await fileTree(rootDir).unwrap();

	const ig = loadIgnore(rootDir);

	const createFile = async (node: FileTree) => {
		// Skip if node.path matches ignore
		const posixPath = toPosix(node.path);
		if (posixPath && ig.ignores(posixPath)) {
			return;
		}

		const nodeTargetDir = path.join(targetDir, node.path);

		if (node.children) {
			if (!fs.existsSync(nodeTargetDir)) {
				// console.log(`Creating directory: ${nodeTargetDir}`);
				fs.mkdirSync(nodeTargetDir, { recursive: true });
			}

			const indexPath = path.join(nodeTargetDir, 'index.md');
			const existingLinks = fs.existsSync(indexPath)
				? fs.readFileSync(indexPath, 'utf8').split('\n')
				: null;

			const newLinks = node.children
				.filter((child) => {
					const posixChildPath = toPosix(child.path);
					return posixChildPath.length && !ig.ignores(posixChildPath);
				})
				.map((child) => {
					const filePath = path.join(nodeTargetDir, child.path);
					const relPath = toPosix(path.relative(nodeTargetDir, filePath));
					if (child.children) {
						return `- [${child.name}](${relPath}/index)`;
					}
					return `- [${child.name}](${relPath})`;
				});

			const sectionHeader = 'This directory contains:';

			if (!fs.existsSync(indexPath)) {
				// Index doesn't exist – create fresh
				fs.writeFileSync(indexPath, `# ${node.name}\n\n${sectionHeader}\n\n${newLinks.join('\n')}`);
			} else {
				// Index exists – append missing links if needed
				const missingLinks = newLinks.filter((link) => !existingLinks?.includes(link));
				if (missingLinks.length > 0 && doAppend) {
					console.log(
						`Appending ${missingLinks.length} new links to: ${indexPath}. Please check the file for updates so you can review them.`
					);
					// Ensure the section
					const updatedLines = existingLinks?.slice() || []; // shallow copy
					const insertIndex = updatedLines.findIndex((line) => line.trim() === sectionHeader);
					if (insertIndex !== -1) {
						const afterHeaderIndex = insertIndex + 1;
						updatedLines.splice(afterHeaderIndex, 0, ...missingLinks);
					} else {
						// Header not found, append to end
						updatedLines.push(`\n${sectionHeader}`, ...missingLinks);
					}
					fs.writeFileSync(indexPath, updatedLines.join('\n'));
				}
			}

			// for (const child of node.children) {
			// 	await createFile(child);
			// }
			return Promise.all(node.children.map(createFile));
		} else {
			const fileDir = path.join(targetDir, path.dirname(node.path));
			const filePath = path.join(fileDir, path.basename(node.path) + '.md');

			if (!fs.existsSync(fileDir)) {
				// console.log(`Creating directory: ${fileDir}`);
				fs.mkdirSync(fileDir, { recursive: true });
			}

			if (!fs.existsSync(filePath)) {
				// const jsdoc = await generateMarkdownWithTypeDoc(node.fullPath);
				// console.log(`Creating file: ${filePath}`);
				fs.writeFileSync(filePath, `# ${node.name}\n\nThis is a file located at ${node.path}.\n\n`);
			}
		}
	};

	await createFile(tree);
};
