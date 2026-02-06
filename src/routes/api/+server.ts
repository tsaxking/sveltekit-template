/**
 * @fileoverview Root API route handlers for `/api`.
 *
 * Provides a small health/metadata endpoint and a consistent JSON response shape
 * for client-side fetch utilities.
 */
import { json } from '@sveltejs/kit';

export const GET = () => {
	return json({
		message: 'Hello from the API!'
	});
};
