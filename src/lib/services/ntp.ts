import { attemptAsync } from 'ts-utils/check';
import { sse } from './sse';
import { z } from 'zod';
import { EventEmitter } from 'ts-utils/event-emitter';

export namespace TimeService {
	let time = Date.now();
	let lastSynced = performance.now();
	let initialized = false;

	const em = new EventEmitter<{
		time: number;
	}>();

	export const on = em.on.bind(em);
	export const off = em.off.bind(em);
	export const once = em.once.bind(em);

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

	export const getTime = () => time + (performance.now() - lastSynced);
	export const getLastSynced = () => lastSynced;

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
