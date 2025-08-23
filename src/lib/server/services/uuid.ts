import { z } from 'zod';
import redis from './redis';

const redisService = redis.createQueue('uuid', z.string(), 10);

class UUIDService {
	private readonly cache: string[] = [];

	constructor(public readonly maxSize: number) {}

	get() {
		const uuid = this.cache.pop();
		if (uuid) return uuid;
		this.request();
		return crypto.randomUUID();
	}

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

export const uuid = () => {
	return uuidService.get();
};
