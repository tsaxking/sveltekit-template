import { sse } from './sse';
import { Redis } from './redis';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';

export namespace TimeService {
	let time = Date.now();
	let lastSynced = performance.now();
	let initialized = false;

	export const init = async () => {
		return attemptAsync(async () => {
			if (initialized) return;
			initialized = true;
			await Redis.connect();

			const service = Redis.createListeningService(
				process.env.NTP_REDIS_NAME || 'ntp_server_name',
				{
					time: z.object({
						time: z.number(),
						date: z.number()
					})
				}
			);

			service.on('time', (data) => {
				lastSynced = performance.now();
				time = data.data.time;
				sse.send('time', data.data);
			});

			sse.on('connect', (client) => {
				client.send('time', {
					time,
					date: Date.now()
				});
			});
		});
	};

	export const getTime = () => {
		const now = performance.now();
		const diff = now - lastSynced;
		return time + diff;
	};

	export const getLastSynced = () => {
		return lastSynced;
	};
}
