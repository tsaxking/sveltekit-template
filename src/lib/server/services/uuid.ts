/**
 * @fileoverview UUID allocator backed by a Redis queue.
 *
 * UUIDs are prefetched from a Redis queue to reduce latency. When the local
 * cache is empty, a fresh UUID is generated immediately while a refill is
 * requested in the background.
 *
 * @example
 * import { uuid } from '$lib/server/services/uuid';
 * const id = uuid();
 */
import { z } from 'zod';
import redis from './redis';

/**
 * Redis queue for UUID strings.
 *
 * @property {string} name - Queue name (namespace).
 * @property {z.ZodType<string>} schema - Validation schema for queue items.
 * @property {number} batchSize - Number of UUIDs to request per pop.
 */
const redisService = redis.createQueue('uuid', z.string(), 10);

/**
 * Local UUID cache with background refill.
 *
 * @property {number} maxSize - Maximum number of UUIDs to retain locally.
 */
class UUIDService {
	private readonly cache: string[] = [];

	/**
	 * @param {number} maxSize - Maximum cache size.
	 */
	constructor(public readonly maxSize: number) {}

	/**
	 * Returns a UUID from cache or generates one immediately.
	 */
	get() {
		const uuid = this.cache.pop();
		if (uuid) return uuid;
		this.request();
		return crypto.randomUUID();
	}

	/**
	 * Requests the next batch of UUIDs from Redis.
	 */
	async request() {
		const res = await redisService.pop();
		if (res.isErr()) {
			console.error('Error reserving UUIDs:', res.error);
			return;
		}
		this.cache.push(...res.value);
	}
}

const uuidService = new UUIDService(10);

/**
 * Returns a UUID string, preferring the cached queue.
 */
export const uuid = () => {
	return uuidService.get();
};
