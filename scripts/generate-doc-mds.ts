import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { fileTree, type FileTree } from '../src/lib/server/utils/files';

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

export default async (target: string) => {
	const rootDir = process.cwd();
	const targetDir = path.join(rootDir, target);
	const tree = await fileTree(rootDir).unwrap();

	const ig = loadIgnore(rootDir);
	//   console.log(`Generating documentation in: ${targetDir}`);
	//   console.log(`Ignoring files based on .docignore in: ${rootDir}`);
	//   console.log(`Root directory: ${rootDir}`);
	//   console.log(ig);

	const createFile = (node: FileTree) => {
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
			//       if (!fs.existsSync(indexPath)) {
			//         const links = node.children
			//          .filter(child => {
			//   const posixChildPath = toPosix(child.path);
			//   return posixChildPath.length && !ig.ignores(posixChildPath);
			// })
			//           .map(child => {
			//             const from = indexPath;
			//             const to = child.children
			//               ? path.join(targetDir, child.path, 'index.md')
			//               : path.join(targetDir, child.path + '.md');

			//             const relPath = path.relative(path.dirname(from), to);
			//             return `- [${child.name}](${toPosix(relPath)})`;
			//           });

			//         // console.log(`Creating index file: ${indexPath}`);

			//         fs.writeFileSync(
			//           indexPath,
			//           `# ${node.name}\n\nThis directory contains:\n\n${links.join('\n')}`
			//         );
			//       }
			const existingLinks = fs.existsSync(indexPath)
				? fs.readFileSync(indexPath, 'utf8').split('\n')
				: null;

			const newLinks = node.children
				.filter((child) => {
					const posixChildPath = toPosix(child.path);
					return posixChildPath.length && !ig.ignores(posixChildPath);
				})
				.map((child) => {
					const from = indexPath;
					const to = child.children
						? path.join(targetDir, child.path, 'index.md')
						: path.join(targetDir, child.path + '.md');
					const relPath = toPosix(path.relative(path.dirname(from), to));
					return `- [${child.name}](${relPath})`;
				});

			const sectionHeader = 'This directory contains:';

			if (!fs.existsSync(indexPath)) {
				// Index doesn't exist – create fresh
				fs.writeFileSync(indexPath, `# ${node.name}\n\n${sectionHeader}\n\n${newLinks.join('\n')}`);
			} else {
				// Index exists – append missing links if needed
				const missingLinks = newLinks.filter((link) => !existingLinks?.includes(link));
				if (missingLinks.length > 0) {
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

			for (const child of node.children) {
				createFile(child);
			}
		} else {
			const fileDir = path.join(targetDir, path.dirname(node.path));
			const filePath = path.join(fileDir, path.basename(node.path) + '.md');

			if (!fs.existsSync(fileDir)) {
				// console.log(`Creating directory: ${fileDir}`);
				fs.mkdirSync(fileDir, { recursive: true });
			}

			if (!fs.existsSync(filePath)) {
				// console.log(`Creating file: ${filePath}`);
				fs.writeFileSync(filePath, `# ${node.name}\n\nThis is a file located at ${node.path}.`);
			}
		}
	};

	createFile(tree);
};
