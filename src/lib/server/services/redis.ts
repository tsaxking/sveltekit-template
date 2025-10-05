import { Redis } from 'redis-utils';
import { config } from '../utils/env';

export default new Redis({
	name: config.redis.name,
	url: config.redis.url
});
