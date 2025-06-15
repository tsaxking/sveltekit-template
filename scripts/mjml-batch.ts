import { resolveAll } from 'ts-utils/check';
import { runTask } from '../src/lib/server/utils/task';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = path.join(process.cwd(), 'mjml');
const OUTPUT_DIR = path.join(process.cwd(), 'private', 'emails');
const TYPE_FILE = path.join(process.cwd(), 'src', 'lib', 'types', 'email.ts');

export default async () => {
	try {
		await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
	} catch {
		// do nothing
	}

	// delete everything in output directory
	const outputs = await fs.promises.readdir(OUTPUT_DIR);
	await Promise.all(outputs.map((o) => fs.promises.unlink(path.join(OUTPUT_DIR, o))));

	const files = await fs.promises.readdir(INPUT_DIR);

	resolveAll(
		await Promise.all(
			files.map(async (f) => {
				return runTask(
					'mjml',
					path.join(INPUT_DIR, f),
					'-o',
					path.join(OUTPUT_DIR, f.replace(/\.mjml$/, '.html'))
				);
			})
		)
	).unwrap();

	const types = await Promise.all(
		files.map(async (f) => {
			const contents = await fs.promises.readFile(path.join(INPUT_DIR, f), 'utf-8');

			const name = f.replace(/\.mjml$/, '');

			const regex = /{{\s*([^{}]+?)\s*}}/g;
			const matches = contents.match(regex);
			if (!matches) {
				return {
					name,
					fields: []
				};
			}

			return {
				name,
				fields: Array.from(new Set(matches.map((m) => m.replace(regex, '$1'))))
			};
		})
	);

	let typeFile = '';

	for (const t of types) {
		typeFile += `'${t.name}': {\n`;
		typeFile += t.fields.map((f) => `        ${f}: string;\n`).join('');
		typeFile += '    };\n';
	}

	await fs.promises.writeFile(
		TYPE_FILE,
		`
export type Email = {
    ${typeFile}
};`.trim()
	);
};
