import { Redis } from 'redis-utils';
import terminal from '../utils/terminal';

if (!process.env.REDIS_NAME) terminal.warn('REDIS_NAME is not set in environment variables');

if (!process.env.REDIS_URL) {
	if (!process.env.REDIS_HOST) terminal.warn('REDIS_HOST is not set in environment variables');
	if (!process.env.REDIS_PORT) terminal.warn('REDIS_PORT is not set in environment variables');
}

export default new Redis({
	name: process.env.REDIS_NAME || 'default',
	url: process.env.REDIS_URL,
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
});
