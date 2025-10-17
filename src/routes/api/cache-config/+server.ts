import { json } from '@sveltejs/kit';
import { config } from '$lib/server/utils/env';
import type { RequestHandler } from './$types';

/**
 * GET /api/cache-config
 * Returns the cache configuration for the service worker
 */
export const GET: RequestHandler = async () => {
	return json(config.cache, {
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			Pragma: 'no-cache',
			Expires: '0'
		}
	});
};
