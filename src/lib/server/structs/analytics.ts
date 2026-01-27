import { text, integer } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import type { Account } from './account';
import { attemptAsync } from 'ts-utils/check';
import { DB } from '../db';
import { Session } from './session';
import { eq, or } from 'drizzle-orm';

export namespace Analytics {
	export const Links = new Struct({
		name: 'analytics_links',
		structure: {
			session: text('session').notNull(),
			url: text('url').notNull(),
			duration: integer('duration').notNull(),
			account: text('account').notNull().default('')
		}
	});

	export type LinkData = typeof Links.sample;

	// for (const i of [...Object.values(DataAction), ...Object.values(PropertyAction)]) {
	// 	Links.block(i, () => true, 'Cannot perform this action on analytics links');
	// }

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
