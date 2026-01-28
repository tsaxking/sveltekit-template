/**
 * @fileoverview Terminal logging helpers with file-backed log persistence.
 *
 * Logs to stdout/stderr and optionally appends to per-level log files based
 * on configuration.
 *
 * @example
 * import terminal from '$lib/server/utils/terminal';
 * terminal.log('Server started');
 */
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { config } from './env';

/** Whether stdout/stderr logging is enabled. */
const doLog = config.logs.enabled;
/** Directory where log files are written. */
const LOG_DIR = config.logs.outdir;

/**
 * Returns a formatted callsite string for log output.
 */
const getCallsite = () => {
	const stack = new Error().stack;
	if (!stack) {
		return '';
	}
	const [fn, ...location] = stack.split('\n')[3].trim().slice(3).split(' ');
	if (fn.includes('/')) {
		return `/${path.relative(process.cwd(), [fn, ...location].join(' ').replace(/\)|\(/g, ''))}`;
	}
	return `${fn} /${path.relative(process.cwd(), location.join(' ').replace(/\)|\(/g, ''))}`;
};

/**
 * Appends a log entry to a file for the specified log type.
 *
 * @param {string} callsite - Formatted callsite string.
 * @param {string} type - Log type (e.g., info, error, warning).
 * @param {unknown[]} args - Log arguments.
 */
export const save = (callsite: string, type: string, ...args: unknown[]) => {
	if (LOG_DIR) {
		// if dir does not exist, create it
		if (!fs.existsSync(LOG_DIR)) {
			fs.mkdirSync(LOG_DIR, { recursive: true });
		}
		if (!fs.existsSync(path.join(process.cwd(), LOG_DIR, type) + '.log')) {
			fs.writeFileSync(path.join(process.cwd(), LOG_DIR, type) + '.log', '');
		}
		return fs.promises.appendFile(
			path.join(process.cwd(), LOG_DIR, type) + '.log',
			`${new Date().toISOString()} [${callsite}] ${args.join(' ')}\n`,
			{ flag: 'a' }
		);
	}
};

/**
 * Logs an informational message to stdout and file.
 *
 * @param {unknown[]} args - Log arguments.
 */
export const log = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog) console.log(new Date().toISOString(), chalk.blue(`[${callsite}]`), '(LOG)', ...args);

	return save(callsite, 'info', ...args);
};

/**
 * Logs an error message to stderr and file.
 *
 * @param {unknown[]} args - Log arguments.
 */
export const error = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.error(new Date().toISOString(), chalk.red(`[${callsite}]`), '(ERROR)', ...args);

	return save(callsite, 'error', ...args);
};

/**
 * Logs a warning message to stdout and file.
 *
 * @param {unknown[]} args - Log arguments.
 */
export const warn = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.warn(new Date().toISOString(), chalk.yellow(`[${callsite}]`), '(WARN)', ...args);

	return save(callsite, 'warning', ...args);
};

/**
 * Convenience logger with `log`, `error`, and `warn` methods.
 *
 * @property {(args: unknown[]) => Promise<void> | void} log - Info logger.
 * @property {(args: unknown[]) => Promise<void> | void} error - Error logger.
 * @property {(args: unknown[]) => Promise<void> | void} warn - Warning logger.
 */
export default {
	log,
	error,
	warn
	// clear: console.clear
};
