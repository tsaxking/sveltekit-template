import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
const { LOG, LOG_FILE } = process.env;

const doLog = ['true', 'y', 'yes', 't'].includes(LOG?.toLowerCase() || 'false');

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
	if (LOG_FILE) {
		// if dir does not exist, create it
		const logDir = path.dirname(path.join(process.cwd(), LOG_FILE));
		if (!fs.existsSync(logDir)) {
			fs.mkdirSync(logDir, { recursive: true });
		}
		if (!fs.existsSync(path.join(process.cwd(), LOG_FILE) + '.log')) {
			fs.writeFileSync(path.join(process.cwd(), LOG_FILE) + '.log', '');
		}
		return fs.promises.appendFile(
			path.join(process.cwd(), LOG_FILE) + '.log',
			`${new Date().toISOString()} [${callsite}] (${type}) ${args.join(' ')}\n`,
			{ flag: 'a' }
		);
	}
};

export const log = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog) console.log(new Date().toISOString(), chalk.blue(`[${callsite}]`), '(LOG)', ...args);

	return save(callsite, 'LOG', ...args);
};

export const error = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.error(new Date().toISOString(), chalk.red(`[${callsite}]`), '(ERROR)', ...args);

	return save(callsite, 'ERROR', ...args);
};

export const warn = (...args: unknown[]) => {
	const callsite = getCallsite();
	if (doLog)
		console.warn(new Date().toISOString(), chalk.yellow(`[${callsite}]`), '(WARN)', ...args);

	return save(callsite, 'WARN', ...args);
};

export default {
	log,
	error,
	warn
	// clear: console.clear
};
