/**
 * @fileoverview Server-side time synchronization service using Redis and SSE.
 *
 * Keeps a local clock synchronized with an upstream time source and broadcasts
 * updates to connected clients.
 *
 * @example
 * import { TimeService } from '$lib/server/services/ntp';
 * await TimeService.init();
 * console.log(TimeService.getTime());
 */
import { sse } from './sse';
import { attemptAsync } from 'ts-utils/check';
import { z } from 'zod';
import redis from './redis';
import { config } from '../utils/env';

/**
 * Time synchronization helpers.
 */
export namespace TimeService {
	/** Current time at last sync (epoch ms). */
	let time = Date.now();
	/** Performance timestamp when last sync was received. */
	let lastSynced = performance.now();
	/** Prevents multiple initializations. */
	let initialized = false;

	/**
	 * Initializes the time listener and SSE broadcaster.
	 */
	export const init = async () => {
		return attemptAsync(async () => {
			if (initialized) return;
			initialized = true;

			const name = config.ntp.server;

			const service = redis.createListener(name || 'ntp_server_name', {
				time: z.object({
					time: z.number(),
					date: z.number()
				})
			});

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

	/**
	 * Returns the current estimated time based on last sync.
	 */
	export const getTime = () => {
		const now = performance.now();
		const diff = now - lastSynced;
		return time + diff;
	};

	/**
	 * Returns the last sync timestamp (performance time).
	 */
	export const getLastSynced = () => {
		return lastSynced;
	};
}
