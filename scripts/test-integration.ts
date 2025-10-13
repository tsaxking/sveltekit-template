import { sleep } from 'ts-utils/sleep';
import { config } from '../src/lib/server/utils/env';

export default async () => {
	let tries = 0;

	const doFetch = (url: string) =>
		new Promise((res, rej) => {
			fetch(url)
				.then((r) => {
					if (r.ok) res(true);
					else rej(new Error(`Status not OK: ${r.status}`));
				})
				.catch((e) => rej(e));

			setTimeout(() => rej(new Error('Fetch timed out')), 5000);
		});

	const run = async () => {
		try {
			await doFetch(`http://localhost:${config.network.port}`);
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
