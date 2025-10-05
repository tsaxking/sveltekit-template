import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { config } from './env';

const doLog = config.logs.enabled;
const LOG_DIR = config.logs.outdir;

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

export const log = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog) console.log(new Date().toISOString(), chalk.blue(`[${callsite}]`), '(LOG)', ...args);

	return save(callsite, 'info', ...args);
};

export const error = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.error(new Date().toISOString(), chalk.red(`[${callsite}]`), '(ERROR)', ...args);

	return save(callsite, 'error', ...args);
};

export const warn = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.warn(new Date().toISOString(), chalk.yellow(`[${callsite}]`), '(WARN)', ...args);

	return save(callsite, 'warning', ...args);
};

export default {
	log,
	error,
	warn
	// clear: console.clear
};
