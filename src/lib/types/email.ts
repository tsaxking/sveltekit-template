/**
 * @fileoverview Email template payload types.
 *
 * Each key maps to the data shape required by the matching HTML template.
 *
 * @example
 * import type { Email } from '$lib/types/email';
 * const payload: Email['forgot-password'] = {
 *   link: 'https://example.com/reset',
 *   supportEmail: 'support@example.com'
 * };
 */
export type Email = {
	/**
	 * Password reset email payload.
	 */
	'forgot-password': {
		link: string;
		supportEmail: string;
	};
	/**
	 * Test email payload.
	 */
	test: {
		service: string;
		link: string;
		linkText: string;
	};
};
