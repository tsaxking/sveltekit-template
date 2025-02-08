import { attemptAsync } from 'ts-utils/check';
import * as inquirer from '@inquirer/prompts';
import FuzzySearch from 'fuzzy-search';
import Table from 'cli-table';
import { Colors } from './colors';
import terminal from '../utils/terminal';

type GlobalConfig = {
	message: string;
	clear?: boolean;
};

export const prompt = async (
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

export const repeatPrompt = async (
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

type Option<T> = {
	value: T;
	name: string;
};

export const select = async <T = unknown>(
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

export const multiSelect = async <T = unknown>(
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

export const confirm = async (config: GlobalConfig) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		return inquirer.confirm({
			message: config.message
		});
	});

export const password = async (config: GlobalConfig) =>
	attemptAsync(async () => {
		if (config.clear) console.clear();
		return inquirer.password({
			message: config.message
		});
	});

export const search = async <T = unknown>(
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

export const selectFromTable = async <T extends Record<string, unknown>>(
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
					terminal.log(config.message);
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

					terminal.log(t.toString());

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

let id = -1;
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
					(await selected()).unwrap();
				} catch (error) {
					terminal.error(error);
				}
			} else {
				terminal.log('Cancelled');
			}

			Folder.home?.action();
		});
	}

	get exit() {
		return new Action('Exit', 'Exit the CLI', '🚪', () => {
			terminal.log('Exiting CLI');
			terminal.log('Goodbye!');
			process.exit(0);
		});
	}

	setParent(parent: Folder) {
		this.parent = parent;
	}
}

export class Action {
	constructor(
		public readonly name: string,
		public readonly description: string,
		public readonly icon: string,
		public readonly _action: () => unknown
	) {}

	public action() {
		return attemptAsync(async () => {
			await this._action();
		});
	}
}
