import { Redis } from 'redis-utils';
import { str } from '../utils/env';

export default (() => {
	const url = str('REDIS_URL', false);
	const name = str('REDIS_NAME', true);

	return new Redis({
		name,
		url,
	});
})();
