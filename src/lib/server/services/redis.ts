/**
 * @fileoverview Redis service instance configured from environment settings.
 *
 * The exported instance is used across server services to provide queues,
 * item groups, and other Redis-backed utilities.
 *
 * @example
 * import redis from '$lib/server/services/redis';
 * const queue = redis.createQueue('emails', z.string(), 100);
 */
import { Redis } from 'redis-utils';
import { config } from '../utils/env';

/**
 * Preconfigured Redis client.
 *
 * @property {string} name - Logical Redis client name for logging/metrics.
 * @property {string} url - Redis connection URL.
 */
export default new Redis({
	name: config.redis.name,
	url: config.redis.url
});
