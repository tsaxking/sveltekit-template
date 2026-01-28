/**
 * @fileoverview Analytics structures and helpers for tracking visited links.
 *
 * Links are recorded per session and optionally associated with an account.
 * Helper methods aggregate and deduplicate URLs for a given account.
 *
 * @example
 * import { Analytics } from '$lib/server/structs/analytics';
 * const count = await Analytics.getCount(account).unwrap();
 */
import { text, integer } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import type { Account } from './account';
import { attemptAsync } from 'ts-utils/check';
import { DB } from '../db';
import { Session } from './session';
import { eq, or } from 'drizzle-orm';

export namespace Analytics {
	/**
	 * Analytics link record.
	 *
	 * @property {string} session - Session ID for the visit.
	 * @property {string} url - Visited URL.
	 * @property {number} duration - Time spent in milliseconds.
	 * @property {string} account - Optional account ID.
	 */
	export const Links = new Struct({
		name: 'analytics_links',
		structure: {
			/** Session ID for the visit. */
			session: text('session').notNull(),
			/** Visited URL. */
			url: text('url').notNull(),
			/** Time spent in milliseconds. */
			duration: integer('duration').notNull(),
			/** Optional account ID. */
			account: text('account').notNull().default('')
		}
	});

	export type LinkData = typeof Links.sample;

	// for (const i of [...Object.values(DataAction), ...Object.values(PropertyAction)]) {
	// 	Links.block(i, () => true, 'Cannot perform this action on analytics links');
	// }

	/**
	 * Returns unique links visited by an account, paged and newest-first.
	 *
	 * @param {Account.AccountData} account - Account to query.
	 * @param {{ limit: number; offset: number }} config - Paging configuration.
	 */
	export const getAccountLinks = (
		account: Account.AccountData,
		config: {
			limit: number;
			offset: number;
		}
	) => {
		return attemptAsync(async () => {
			// get all sessions for the account, then all the links for those sessions
			// all in one query
			const res = await DB.select()
				.from(Links.table)
				.innerJoin(Session.Session.table, eq(Session.Session.table.accountId, account.id))
				.where(
					or(eq(Session.Session.table.accountId, account.id), eq(Links.table.account, account.id))
				);

			return res
				.filter(
					(v, i, a) => a.findIndex((v2) => v2.analytics_links.url === v.analytics_links.url) === i
				)
				.slice(config.offset, config.offset + config.limit)
				.map((r) => Links.Generator(r.analytics_links))
				.reverse();
		});
	};

	/**
	 * Returns the total number of unique links for an account.
	 *
	 * @param {Account.AccountData} account - Account to query.
	 */
	export const getCount = (account: Account.AccountData) => {
		return attemptAsync(async () => {
			const links = await getAccountLinks(account, {
				limit: Infinity,
				offset: 0
			}).unwrap();
			return links.length;
		});
	};
}

export const _links = Analytics.Links.table;
