/* eslint-disable @typescript-eslint/no-explicit-any */
import { Folder, Action, alert, select, prompt, confirm, promptIp } from './utils';
import routeTree from '../scripts/create-route-tree';
import fs from 'fs';
import path from 'path';
import { Limiting } from '../src/lib/server/structs/limiting';
import { selectData } from './struct';
import { globalCols } from 'drizzle-struct/back-end';

export default new Folder(
	'Page Limiting',
	'Control access to specific pages based on IP addresses or block them entirely. This overwrites even admin priveleges.',
	'🚧',
	[
		new Action('Block Page', 'Block access to a spcific page for all users', '🚫', async () => {
			try {
				await routeTree();
			} catch (error) {
				console.error('Error creating route tree:', error);
			}

			let currentlyBlocked = '';

			try {
				currentlyBlocked = fs.readFileSync(
					path.join(process.cwd(), 'private', 'blocked.pages'),
					'utf-8'
				);
			} catch (error) {
				console.error('Error reading blocked pages:', error);
			}

			const routeFile = fs.readFileSync(
				path.join(process.cwd(), 'private', 'route-tree.pages'),
				'utf-8'
			);

			const currentlyBlockedLines = currentlyBlocked
				.split('\n')
				.filter((line) => line.trim() !== '');
			const routeLines = routeFile
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean)
				.filter((line) => !currentlyBlockedLines.includes(line));
			const res = await select({
				message: 'Select a page to block',
				options: [
					{
						name: '[Custom]',
						value: '[Custom]'
					},
					...routeLines.map((line) => ({
						name: line,
						value: line
					}))
				]
			}).unwrap();

			if (res === '[Custom]') {
				const customPage = await prompt({
					message: 'Enter the custom page to block',
					clear: true
				}).unwrap();
				if (!customPage) {
					await alert({
						message: 'No page entered.',
						clear: true
					});
					return;
				}
				if (currentlyBlockedLines.includes(customPage)) {
					await alert({
						message: `Page ${customPage} is already blocked.`,
						clear: true
					});
					return;
				}
				currentlyBlocked += `\n${customPage}`;
				fs.writeFileSync(path.join(process.cwd(), 'private', 'blocked.pages'), currentlyBlocked);
				return await alert({
					message: `Page ${customPage} has been blocked.`,
					clear: true
				});
			}

			if (!res) {
				await alert({
					message: 'No page selected to block.',
					clear: true
				});
			} else {
				currentlyBlocked += `\n${res}`;
				fs.writeFileSync(path.join(process.cwd(), 'private', 'blocked.pages'), currentlyBlocked);
				await alert({
					message: `Page ${res} has been blocked.`,
					clear: true
				});
			}
		}),
		new Action(
			'Unblock Page',
			'Unblock access to a specific page for all users',
			'✅',
			async () => {
				try {
					await routeTree();
				} catch (error) {
					console.error('Error creating route tree:', error);
				}
				let currentlyBlocked = '';

				try {
					currentlyBlocked = fs.readFileSync(
						path.join(process.cwd(), 'private', 'blocked.pages'),
						'utf-8'
					);
				} catch (error) {
					console.error('Error reading blocked pages:', error);
				}

				const currentlyBlockedLines = currentlyBlocked
					.split('\n')
					.filter((line) => line.trim() !== '');
				if (currentlyBlockedLines.length === 0) {
					await alert({
						message: 'No pages are currently blocked.',
						clear: true
					});
					return;
				}

				const res = await select({
					message: 'Select a page to unblock',
					options: currentlyBlockedLines.map((line) => ({
						name: line,
						value: line
					}))
				}).unwrap();

				if (!res) {
					await alert({
						message: 'No page selected to unblock.',
						clear: true
					});
				} else {
					currentlyBlocked = currentlyBlocked.replace(`\n${res}`, '');
					fs.writeFileSync(path.join(process.cwd(), 'private', 'blocked.pages'), currentlyBlocked);
					await alert({
						message: `Page ${res} has been unblocked.`,
						clear: true
					});
				}
			}
		),
		new Action(
			'Create IP Limited Page',
			'Create a page that is only accessible to specific IP addresses',
			'🌐',
			async () => {
				try {
					await routeTree();
				} catch (error) {
					console.error('Error creating route tree:', error);
				}
				let currentlyLimited = '';

				try {
					currentlyLimited = fs.readFileSync(
						path.join(process.cwd(), 'private', 'ip-limited.pages'),
						'utf-8'
					);
				} catch (error) {
					console.error('Error reading ip-limited pages:', error);
				}

				const currentlyLimitedLines = currentlyLimited
					.split('\n')
					.filter((line) => line.trim() !== '');
				const routeFile = fs.readFileSync(
					path.join(process.cwd(), 'private', 'route-tree.pages'),
					'utf-8'
				);

				const routeLines = routeFile
					.split('\n')
					.map((l) => l.trim())
					.filter(Boolean)
					.filter((line) => !currentlyLimitedLines.includes(line));

				const res = await select({
					message: 'Select a page to limit by IP',
					options: [
						{
							name: '[Custom]',
							value: '[Custom]'
						},
						...routeLines.map((line) => ({
							name: line,
							value: line
						}))
					]
				}).unwrap();

				if (res === '[Custom]') {
					const customPage = await prompt({
						message: 'Enter the custom page to limit by IP',
						clear: true
					}).unwrap();
					if (!customPage) {
						await alert({
							message: 'No page entered.',
							clear: true
						});
						return;
					}
					if (currentlyLimitedLines.includes(customPage)) {
						await alert({
							message: `Page ${customPage} is already limited by IP.`,
							clear: true
						});
						return;
					}
					currentlyLimited += `\n${customPage}`;
					fs.writeFileSync(
						path.join(process.cwd(), 'private', 'ip-limited.pages'),
						currentlyLimited
					);
					return await alert({
						message: `Page ${customPage} has been limited by IP.`,
						clear: true
					});
				}

				if (!res) {
					await alert({
						message: 'No page selected to limit by IP.',
						clear: true
					});
					return;
				}

				if (currentlyLimitedLines.includes(res)) {
					await alert({
						message: `Page ${res} is already limited by IP.`,
						clear: true
					});
					return;
				}
			}
		),
		new Action(
			'Unlimit IP Limited Page',
			'Remove IP limitation from a specific page. This will not delete the rulesets, so you can reapply them later.',
			'🔓',
			async () => {
				try {
					await routeTree();
				} catch (error) {
					console.error('Error creating route tree:', error);
				}
				let currentlyLimited = '';

				try {
					currentlyLimited = fs.readFileSync(
						path.join(process.cwd(), 'private', 'ip-limited.pages'),
						'utf-8'
					);
				} catch (error) {
					console.error('Error reading ip-limited pages:', error);
				}

				const currentlyLimitedLines = currentlyLimited
					.split('\n')
					.filter((line) => line.trim() !== '');
				if (currentlyLimitedLines.length === 0) {
					await alert({
						message: 'No pages are currently limited by IP.',
						clear: true
					});
					return;
				}

				const res = await select({
					message: 'Select a page to remove IP limitation',
					options: currentlyLimitedLines.map((line) => ({
						name: line,
						value: line
					}))
				}).unwrap();

				if (!res) {
					await alert({
						message: 'No page selected to remove IP limitation.',
						clear: true
					});
				} else {
					currentlyLimited = currentlyLimited.replace(`\n${res}`, '');
					fs.writeFileSync(
						path.join(process.cwd(), 'private', 'ip-limited.pages'),
						currentlyLimited
					);
					await alert({
						message: `Page ${res} has been removed from IP limitation.`,
						clear: true
					});
				}
			}
		),
		new Action(
			'Create IP Page Ruleset',
			'Create a ruleset for IP-based page access',
			'📜',
			async () => {
				let pages: string[] = [];

				try {
					pages = fs
						.readFileSync(path.join(process.cwd(), 'private', 'ip-limited.pages'), 'utf-8')
						.split('\n')
						.filter((line) => line.trim() !== '');
				} catch (error) {
					console.error('Error reading ip-limited pages:', error);
				}

				if (pages.length === 0) {
					await alert({
						message: 'No IP-limited pages found. Please create one first.',
						clear: true
					});
					return;
				}

				const page = await select({
					message: 'Select a page to create a ruleset for',
					options: pages
						.filter((p) => p.trim().startsWith('/'))
						.map((p) => ({
							name: p,
							value: p
						}))
				}).unwrap();

				if (!page) {
					return await alert({
						message: 'No page selected for ruleset creation.',
						clear: true
					});
				}

				const ip = await promptIp('Enter the IP address to allow access to this page').unwrap();

				if (
					await confirm({
						message: `Are you sure you want to create a ruleset for IP ${ip} on page ${page}?`
					}).unwrap()
				) {
					const res = await Limiting.PageRuleset.new({
						ip,
						page
					});

					if (res.isOk()) {
						await alert({
							message: `Ruleset created for IP ${ip} on page ${page}.`,
							clear: true
						});
					} else {
						await alert({
							message: `Failed to create ruleset: ${res.error.message}`,
							clear: true
						});
					}
				} else {
					await alert({
						message: 'Ruleset creation cancelled.',
						clear: true
					});
				}
			}
		),
		new Folder('Delete IP Page Ruleset', 'Delete an existing IP-based page ruleset', '🗑️', [
			new Action('Delete IP', 'Delete all rulesets for a specific IP address', '🗑️', async () => {
				const ip = await promptIp('Enter the IP address to delete rulesets for').unwrap();

				const count = await Limiting.PageRuleset.fromProperty('ip', ip, {
					type: 'count'
				});

				if (count.isErr()) {
					await alert({
						message: `Failed to count rulesets for IP ${ip}: ${count.error.message}`,
						clear: true
					});
					return;
				}

				if (count.value === 0) {
					await alert({
						message: `No rulesets found for IP ${ip}.`,
						clear: true
					});
					return;
				}

				if (
					await confirm({
						message: `Are you sure you want to delete ${count.value} rulesets for IP ${ip}?`
					}).unwrap()
				) {
					await Limiting.PageRuleset.fromProperty('ip', ip, {
						type: 'stream',
						includeArchived: true
					}).pipe((rs) => rs.delete());
					await alert({
						message: `Deleted ${count.value} rulesets for IP ${ip}.`,
						clear: true
					});
				} else {
					await alert({
						message: 'Deletion cancelled.',
						clear: true
					});
				}
			}),
			new Action(
				"Delete Page's Rulesets",
				'Delete all rulesets for a specific page',
				'🗑️',
				async () => {
					const page = await prompt({
						message: 'Enter the page to delete rulesets for',
						clear: true
					}).unwrap();

					if (!page) {
						await alert({
							message: 'No page entered.',
							clear: true
						});
						return;
					}

					const count = await Limiting.PageRuleset.fromProperty('page', page, {
						type: 'count'
					});

					if (count.isErr()) {
						await alert({
							message: `Failed to count rulesets for page ${page}: ${count.error.message}`,
							clear: true
						});
						return;
					}

					if (count.value === 0) {
						await alert({
							message: `No rulesets found for page ${page}.`,
							clear: true
						});
						return;
					}

					if (
						await confirm({
							message: `Are you sure you want to delete ${count.value} rulesets for page ${page}?`
						}).unwrap()
					) {
						await Limiting.PageRuleset.fromProperty('page', page, {
							type: 'stream',
							includeArchived: true
						}).pipe((rs) => rs.delete());
						await alert({
							message: `Deleted ${count.value} rulesets for page ${page}.`,
							clear: true
						});
					} else {
						await alert({
							message: 'Deletion cancelled.',
							clear: true
						});
					}
				}
			),
			new Action(
				'Search Rulesets by Page',
				'Search for rulesets by page, then select one to delete',
				'🔍',
				async () => {
					const page = await prompt({
						message: 'Enter the page to search rulesets for',
						clear: true
					}).unwrap();

					if (!page) {
						await alert({
							message: 'No page entered.',
							clear: true
						});
						return;
					}

					const rules = await Limiting.PageRuleset.fromProperty('page', page, {
						type: 'all'
					});

					if (rules.isErr()) {
						await alert({
							message: `Failed to search rulesets for page ${page}: ${rules.error.message}`,
							clear: true
						});
						return;
					}

					if (rules.value.length === 0) {
						await alert({
							message: `No rulesets found for page ${page}.`,
							clear: true
						});
						return;
					}

					const select =
						(await selectData(rules.value, 'Select a ruleset to delete', {
							omit: Object.keys(globalCols) as any
						}).unwrap()) ?? -1;

					const selected = rules.value[select];

					if (!selected) {
						await alert({
							message: 'No ruleset selected.',
							clear: true
						});
						return;
					} else {
						const res = await selected.delete();
						if (res.isOk()) {
							await alert({
								message: `Deleted ruleset for IP ${selected.data.ip} on page ${selected.data.page}.`,
								clear: true
							});
						} else {
							await alert({
								message: `Failed to delete ruleset: ${res.error.message}`,
								clear: true
							});
						}
					}
				}
			),
			new Action('Search Rulesets by IP', 'Search for rulesets by IP address', '🔍', async () => {
				const ip = await promptIp('Enter the IP address to search rulesets for').unwrap();

				const rules = await Limiting.PageRuleset.fromProperty('ip', ip, {
					type: 'all'
				});

				if (rules.isErr()) {
					await alert({
						message: `Failed to search rulesets for IP ${ip}: ${rules.error.message}`,
						clear: true
					});
					return;
				}

				if (rules.value.length === 0) {
					await alert({
						message: `No rulesets found for IP ${ip}.`,
						clear: true
					});
					return;
				}

				const select =
					(await selectData(rules.value, 'Select a ruleset to delete', {
						omit: Object.keys(globalCols) as any
					}).unwrap()) ?? -1;

				const selected = rules.value[select];

				if (!selected) {
					await alert({
						message: 'No ruleset selected.',
						clear: true
					});
					return;
				} else {
					const res = await selected.delete();
					if (res.isOk()) {
						await alert({
							message: `Deleted ruleset for IP ${selected.data.ip} on page ${selected.data.page}.`,
							clear: true
						});
					} else {
						await alert({
							message: `Failed to delete ruleset: ${res.error.message}`,
							clear: true
						});
					}
				}
			})
		])
	]
);
