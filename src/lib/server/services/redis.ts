import { Redis } from 'redis-utils';
import terminal from '../utils/terminal';
import { str } from '../utils/env';

export default (() => {
	const url = str('REDIS_URL', false);
	const name = str('REDIS_NAME', true);
	const host = str('REDIS_HOST', false) || 'localhost';
	const port = str('REDIS_PORT', false) ? parseInt(str('REDIS_PORT', false)!) : 6379;

	if (!url) {
		if (!host) terminal.warn('REDIS_HOST is not set in environment variables');
		if (!port) terminal.warn('REDIS_PORT is not set in environment variables');
	}

	return new Redis({
		name,
		url,
		host,
		port
	});
})();
