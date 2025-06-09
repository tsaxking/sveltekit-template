import path from 'path';
import { runTs } from '../src/lib/server/utils/task';
import terminal from '../src/lib/server/utils/terminal';
import fs from 'fs/promises';
import { select, prompt } from '../cli/utils';

// Convert import.meta.url to a file path

const main = async () => {
	let [, , file, ...args] = process.argv;

	if (!file) {
		const scripts = (await fs.readdir(path.join(process.cwd(), 'scripts'))).filter(
			(s) => s.endsWith('.ts') && s !== 'index.ts'
		);
		const chosen = (
			await select({
				message: 'Select a script to run',
				options: scripts.map((s) => ({
					name: s,
					value: s
				}))
			})
		).unwrap();
		if (!chosen) {
			process.exit();
		}
		file = chosen;
		args =
			(
				await prompt({
					message: 'Enter arguments (space separated)'
				})
			)
				.unwrap()
				?.split(' ') ?? [];
	}

	terminal.log('Running file:', file);

	const res = await runTs(path.join('scripts', file), 'default', ...args);

	if (res.isErr()) {
		await terminal.error(res.error);
		process.exit(1);
	}

	if (res.isOk()) {
		await terminal.log(res.value);
		process.exit(0);
	}
};

// Vite-specific check: is this the entry module?

if (!globalThis.__vite_node_entry || globalThis.__vite_node_entry === import.meta.url) {
	main();
}
