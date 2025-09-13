import { sleep } from 'ts-utils/sleep';
import { num } from '../src/lib/server/utils/env';

export default async () => {
	let tries = 0;

	const run = async () => {
		try {
			await fetch(`http://localhost:${num('PORT', true)}`);
			console.log('Server is up!');
		} catch (error) {
			console.error('Error occurred while checking server status:', error);
			tries++;
			await sleep(3000);
			if (tries < 5) return run();
			else {
				console.error('Server is not up');
				process.exit(1);
			}
		}
	};
	await run();
};
