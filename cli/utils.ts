/**
 * @fileoverview CLI prompting, selection, and menu utilities.
 */
import { attemptAsync } from 'ts-utils/check';
import * as inquirer from '@inquirer/prompts';
import FuzzySearch from 'fuzzy-search';
import Table from 'cli-table';
import { Colors } from './colors';
import terminal from '../src/lib/server/utils/terminal';
import chalk from 'chalk';
import { getPublicIp } from '$lib/server/utils/env';

/**
 * Shared prompt configuration.
 */
type GlobalConfig = {
	message: string;
	clear?: boolean;
};

/**
 * Prompt for a single line of input.
 *
 * @param config - Prompt configuration.
 * @returns Result wrapper containing the input string.
 *
 * @example
 * const name = (await prompt({ message: 'Enter name' })).unwrap();
 */
export const prompt = (
	config: GlobalConfig & {
		default?: string;
	}
) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		const res = await inquirer.input({
			message: config.message
		});
		if (!res) {
			return config.default;
		}

		return res;
	});

/**
 * Prompt for input with optional validation and retry.
 *
 * @param config - Prompt configuration with validation.
 * @returns Result wrapper containing the input string.
 */
export const repeatPrompt = (
	config: GlobalConfig & {
		validate?: (output: string) => boolean;
		allowBlank?: boolean;
	}
) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		let firstTime = true;
		const run = async (): Promise<string> => {
			const res = await inquirer.input({
				message: firstTime ? config.message : 'Invalid input. ' + config.message
			});
			if (!res && config.allowBlank) {
				return '';
			}
			firstTime = false;
			if (!res) {
				return run();
			}
			if (config.validate && !config.validate(res)) {
				return run();
			}
			return res;
		};

		return run();
	});

/**
 * Display a message and wait for any key press.
 *
 * @param config - Alert configuration.
 */
export const alert = (config: GlobalConfig) => {
	return new Promise<void>((res) => {
		if (config.clear) console.clear();
		console.log(config.message);
		console.log(chalk.gray('Press any key to continue'));
		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on('data', () => {
			process.stdin.setRawMode(false);
			process.stdin.pause();
			res();
		});
	});
};

/**
 * Select option entry.
 */
type Option<T> = {
	value: T;
	name: string;
};

/**
 * Prompt to select a single option.
 *
 * @param config - Selection configuration.
 * @returns Result wrapper with selected value.
 */
export const select = <T = unknown>(
	config: GlobalConfig & {
		options: Option<T>[];
		exit?: boolean;
		cancel?: boolean;
	}
) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		const choices: {
			name: string;
			value: T | undefined | 'exit';
		}[] = config.options.map((o) => ({
			name: o.name,
			value: o.value
		}));

		if (config.cancel) {
			choices.push({
				name: 'Cancel',
				value: undefined
			});
		}

		if (config.exit) {
			choices.push({
				name: 'Exit',
				value: 'exit'
			});
		}

		const res = await inquirer.select<T | undefined | 'exit'>({
			message: config.message,
			choices
			// loop: true,
		});

		if (res === 'exit') {
			process.exit(0);
		}

		return res;
	});

/**
 * Prompt to select multiple options.
 *
 * @param config - Selection configuration.
 * @returns Result wrapper with selected values.
 */
export const multiSelect = <T = unknown>(
	config: GlobalConfig & {
		options: Option<T>[];
	}
) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		return inquirer.checkbox({
			message: config.message,
			choices: config.options.map((o) => ({
				name: o.name,
				value: o.value
			}))
			// loop: true,
		});
	});

/**
 * Prompt for a yes/no confirmation.
 *
 * @param config - Prompt configuration.
 * @returns Result wrapper with boolean choice.
 */
export const confirm = (config: GlobalConfig) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		return inquirer.confirm({
			message: config.message
		});
	});

/**
 * Prompt for a hidden password value.
 *
 * @param config - Prompt configuration.
 * @returns Result wrapper with password string.
 */
export const password = (config: GlobalConfig) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		return inquirer.password({
			message: config.message
		});
	});

/**
 * Prompt to search and select an option.
 *
 * @param config - Search configuration.
 * @returns Result wrapper with selected value.
 */
export const search = <T = unknown>(
	config: GlobalConfig & {
		options: Option<T>[];
	}
) =>
	attemptAsync(async () => {
		return inquirer.search({
			message: config.message,
			source: (input) => {
				if (!input) {
					return config.options;
				}
				const searcher = new FuzzySearch(config.options, ['name']);
				return searcher.search(input);
			}
		});
	});

/**
 * Render a table of records and select a row using arrow keys.
 *
 * @param config - Table selection configuration.
 * @returns Result wrapper containing the selected index.
 */
export const selectFromTable = <T extends Record<string, unknown>>(
	config: GlobalConfig & {
		options: T[];
		omit?: (keyof T)[];
	}
) =>
	attemptAsync(
		async () =>
			new Promise<number | undefined>((res) => {
				if (config.clear) console.clear();
				if (!config.options.length) {
					terminal.log('No options available');
					return res(undefined);
				}

				const headers = Object.keys(config.options[0]).filter(
					(k) => !config.omit?.includes(k as keyof T)
				);

				const stdin = process.stdin;
				stdin.setRawMode(true);
				stdin.resume();
				stdin.setEncoding('utf8');

				let selected = 0;

				const run = (selected: number) => {
					console.clear();
					console.log(config.message);
					const t = new Table({
						head: headers
					});

					t.push(
						...config.options.map((o, i) =>
							headers.map((h) => {
								if (i === selected) {
									return `${Colors.FgBlue}${o[h]}${Colors.Reset}`;
								}
								return String(o[h]);
							})
						)
					);

					console.log(t.toString());

					stdin.on('data', handleKey);
				};

				const handleKey = (key: string) => {
					switch (key) {
						case '\u0003':
							process.exit();
							break;
						case '\r':
							console.clear();
							res(selected);
							break;
						case '\u001b[A':
							selected = selected === 0 ? config.options.length - 1 : selected - 1;
							run(selected);
							break;
						case '\u001b[B':
							selected = selected === config.options.length - 1 ? 0 : selected + 1;
							run(selected);
							break;
					}

					stdin.off('data', handleKey);
				};

				run(selected);
			})
	);

/**
 * Render a table of records and wait for Enter to close.
 *
 * @param config - Table view configuration.
 * @returns Result wrapper that resolves on close.
 */
export const viewTable = <T extends Record<string, unknown>>(
	config: GlobalConfig & {
		options: T[];
		omit?: (keyof T)[];
	}
) =>
	attemptAsync(
		async () =>
			new Promise<void>((res, rej) => {
				// No selection process, just viewing, press any key (except scrolls) to exit
				if (!config.options.length) {
					return alert({
						message: 'Table is empty',
						clear: config.clear
					})
						.then(res)
						.catch(rej);
				}

				if (config.clear) console.clear();

				const headers = Object.keys(config.options[0]).filter(
					(k) => !config.omit?.includes(k as keyof T)
				);

				const stdin = process.stdin;

				stdin.setRawMode(true);
				stdin.resume();
				stdin.setEncoding('utf8');

				const run = () => {
					console.clear();
					console.log(config.message);
					const t = new Table({
						head: headers
					});

					t.push(
						...config.options.map((o) =>
							headers.map((h) => {
								return String(o[h]);
							})
						)
					);

					console.log(t.toString());

					stdin.on('data', handleKey);
				};

				const handleKey = (key: string) => {
					switch (key) {
						case '\u0003':
							process.exit();
							break;
						case '\r':
							console.clear();
							res();
							break;
					}

					stdin.off('data', handleKey);
				};

				run();
			})
	);

let id = -1;
/**
 * CLI menu folder that contains actions and nested folders.
 */
export class Folder {
	public static home?: Folder;

	private parent?: Folder;
	private id = (id -= -1); // :) shhhhh.... don't tell anyone

	constructor(
		public readonly name: string,
		public readonly description: string,
		public readonly icon: string,
		public readonly actions: (Action | Folder)[]
	) {
		for (const a of this.actions) {
			if (a instanceof Folder) {
				a.setParent(this);
			}
		}
	}

	/**
	 * Open the folder menu and execute the selected action.
	 */
	public action() {
		return attemptAsync(async () => {
			const extras: (Action | Folder)[] = [this.exit];
			if (this.parent) {
				extras.unshift(this.parent);
			}
			if (Folder.home && this.parent?.id !== Folder.home.id) {
				if (this.id !== Folder.home.id) {
					extras.unshift(Folder.home);
				}
			}
			const selected = (
				await select({
					message: this.name,
					clear: true,
					options: [...this.actions, ...extras].map((a) => ({
						name: `${a.icon} ${a.name}: ${Colors.Dim}${a.description}${Colors.Reset}`,
						value: () => a.action()
					}))
				})
			).unwrap();

			if (selected) {
				try {
					await selected();
				} catch (error) {
					terminal.error('CLI Error:', error);
				}
			} else {
				terminal.log('Cancelled');
			}

			Folder.home?.action();
		});
	}

	/**
	 * Exit action for the CLI.
	 */
	get exit() {
		return new Action('Exit', 'Exit the CLI', '🚪', () => {
			terminal.log('Exiting CLI');
			terminal.log('Goodbye!');
			process.exit(0);
		});
	}

	/**
	 * Set the parent folder for navigation.
	 */
	setParent(parent: Folder) {
		this.parent = parent;
	}
}

/**
 * CLI action wrapper.
 */
export class Action {
	constructor(
		public readonly name: string,
		public readonly description: string,
		public readonly icon: string,
		public readonly _action: () => unknown
	) {}

	/**
	 * Execute the action callback.
	 */
	public action() {
		return this._action();
	}
}

/**
 * Prompt for an IPv4 address, or fall back to the public IP.
 *
 * @param message - Prompt message.
 * @returns Result wrapper containing the IP string.
 */
export const promptIp = (message: string) => {
	return attemptAsync<string>(async () => {
		const res = await repeatPrompt({
			message: message + '(Leave empty to use public IP)',
			validate: (input) => {
				// Simple IP address regex (IPv4)
				const ipRegex =
					/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
				return ipRegex.test(input);
			},
			allowBlank: true
		}).unwrap();

		if (!res) {
			return getPublicIp().unwrap();
		}
		return res;
	});
};
