/**
 * @fileoverview Client-side analytics models and helpers.
 *
 * Exposes the `Analytics.Links` struct and remote query wrappers.
 *
 * @example
 * import { Analytics } from '$lib/model/analytics';
 * const links = await Analytics.myLinks({ page: 0, limit: 20 }).unwrap();
 */
import { Struct } from '$lib/services/struct/index';
import { browser } from '$app/environment';
import { sse } from '$lib/services/sse';
import { attemptAsync } from 'ts-utils';
import * as remote from '$lib/remotes/analytics.remote';

/**
 * Analytics client helpers.
 */
export namespace Analytics {
	/**
	 * Struct for analytics link records.
	 *
	 * @property {string} session - Session id that created the link.
	 * @property {string} url - Page URL.
	 * @property {number} duration - Time spent (seconds).
	 * @property {string} account - Optional account id.
	 */
	export const Links = new Struct({
		name: 'analytics_links',
		structure: {
			/** Session id that created the link. */
			session: 'string',
			/** Page URL. */
			url: 'string',
			/** Time spent (seconds). */
			duration: 'number',
			/** Optional account id. */
			account: 'string'
		},
		browser,
		socket: sse
	});

	/** Sample data type for analytics links. */
	export type LinkData = typeof Links.sample;

	/**
	 * Fetches the current user's analytics links.
	 *
	 * @param config - Pagination config.
	 */
	export const myLinks = (config: { page: number; limit: number }) => {
		return attemptAsync(async () => {
			return remote.myLinks(config);
		});
	};

	/**
	 * Returns a count of distinct links for the current session/account.
	 */
	export const count = () => {
		return attemptAsync(async () => {
			return remote.count();
		});
	};
}
