import { config } from 'dotenv';
import { sleep } from 'ts-utils/sleep';

export default async () => {
	config();
	let tries = 0;

	const run = async () => {
		try {
			await fetch(`http://localhost:${process.env.PORT}`);
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
