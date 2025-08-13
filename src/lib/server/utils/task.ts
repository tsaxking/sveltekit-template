import { attemptAsync } from 'ts-utils/check';
import { exec } from 'child_process';
import path from 'path';
// import * as tsNode from 'ts-node';
import url from 'url';

/**
 * Runs a shell command and returns the output.
 *
 * @param {...string[]} args
 * @returns {*}
 */
export const runTask = (...args: string[]) => {
	return attemptAsync(
		async () =>
			new Promise<string>((res, rej) =>
				exec(args.join(' '), (error, stdout) => {
					if (error) {
						rej(error);
					}
					res(stdout.trim());
				})
			)
	);
};
/**
 * Runs a TypeScript file and calls a specific function with parameters.
 *
 * @param {string} file
 * @param {string} fn
 * @param {...unknown[]} params
 * @returns {*}
 */
export const runTs = (file: string, fn: string, ...params: unknown[]) => {
	return attemptAsync(async () => {
		const fullpath = path.join(process.cwd(), file);

		const mod = await import(url.pathToFileURL(fullpath).href);
		const func = mod[fn];

		if (!func) {
			throw new Error(`Function ${fn} not found in ${file}`);
		}
		if (typeof func !== 'function') {
			throw new Error(`${fn} is not a function`);
		}

		return await func(...params);
	});
};
