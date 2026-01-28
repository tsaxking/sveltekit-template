/**
 * @fileoverview Client-side NTP time synchronization service.
 *
 * Keeps a local clock in sync with server time received over SSE, with manual
 * sync fallback.
 *
 * @example
 * import { TimeService } from '$lib/services/ntp';
 * await TimeService.init();
 * console.log(TimeService.getTime());
 */
import { attemptAsync } from 'ts-utils/check';
import { sse } from './sse';
import { z } from 'zod';
import { EventEmitter } from 'ts-utils/event-emitter';

/**
 * Time synchronization utilities.
 */
export namespace TimeService {
	let time = Date.now();
	let lastSynced = performance.now();
	let initialized = false;

	const em = new EventEmitter<{
		time: number;
	}>();

	/** Subscribe to time updates. */
	export const on = em.on.bind(em);
	/** Unsubscribe from time updates. */
	export const off = em.off.bind(em);
	/** Subscribe once to time updates. */
	export const once = em.once.bind(em);

	/**
	 * Initializes SSE listeners for time updates.
	 */
	export const init = async () => {
		return attemptAsync(async () => {
			if (initialized) return;
			initialized = true;

			sse.on('time', (data) => {
				const parsed = z
					.object({
						time: z.number(),
						date: z.number()
					})
					.safeParse(data);

				if (!parsed.success) {
					console.error('Invalid time data received:', parsed.error);
					return;
				}

				const { time: ntpTime } = parsed.data;

				time = ntpTime + sse.latency / 2;
				lastSynced = performance.now();

				em.emit('time', time);
			});
		});
	};

	/**
	 * Returns the current estimated time in milliseconds.
	 */
	export const getTime = () => time + (performance.now() - lastSynced);
	/**
	 * Returns the last sync performance timestamp.
	 */
	export const getLastSynced = () => lastSynced;

	/**
	 * Forces a sync by calling the NTP API.
	 */
	export const forceSync = async () => {
		return attemptAsync(async () => {
			const data = await fetch('/api/ntp').then((r) => r.json());
			const parsed = z
				.object({
					time: z.number(),
					date: z.number()
				})
				.safeParse(data);
			if (!parsed.success) {
				console.error('Invalid time data received:', parsed.error);
				return time;
			}
			const { time: ntpTime } = parsed.data;
			time = ntpTime + sse.latency / 2;
			lastSynced = performance.now();
			em.emit('time', time);
			return time;
		});
	};
}
