import { attemptAsync } from 'ts-utils/check';
import { Struct } from 'drizzle-struct/back-end';
import { integer, text } from 'drizzle-orm/pg-core';
import { Account } from './account';
import { Permissions } from './permissions';
import { Universes } from './universe';

const { PUBLIC_DOMAIN, SESSION_DURATION } = process.env;

interface RequestEvent {
	cookies: {
		get: (name: string) => string | undefined;
		set: (
			name: string,
			value: string,
			options: {
				httpOnly?: boolean;
				domain?: string;
				sameSite?: 'none';
				path: string;
				expires?: Date;
			}
		) => void;
	};
}

export namespace Session {
	export const Session = new Struct({
		name: 'session',
		structure: {
			accountId: text('account_id').notNull(),
			ip: text('ip').notNull(),
			userAgent: text('user_agent').notNull(),
			requests: integer('requests').notNull(),
			prevUrl: text('prev_url').notNull()
		},
		frontend: false
	});

	export type SessionData = typeof Session.sample;

	export const getSession = (event: RequestEvent) => {
		return attemptAsync(async () => {
			// TODO: will eventually split domain later once we use the same cookie id as session id upon creation
			const id = event.cookies.get('ssid:' + PUBLIC_DOMAIN);

			const create = async () => {
				const session = (
					await Session.new({
						accountId: '',
						ip: '',
						userAgent: '',
						requests: 0,
						prevUrl: ''
					})
				).unwrap();

				event.cookies.set('ssid:' + PUBLIC_DOMAIN, session.id, {
					httpOnly: false,
					domain: PUBLIC_DOMAIN ?? '',
					path: '/',
					expires: new Date(Date.now() + parseInt(SESSION_DURATION ?? '0'))
				});

				return session;
			};

			if (!id) {
				return create();
			}

			const s = (await Session.fromId(id)).unwrap();

			if (!s) {
				return create();
			}

			return s;
		});
	};

	export const getAccount = (session: SessionData) => {
		return attemptAsync(async () => {
			const s = (await Account.Account.fromId(session.data.accountId)).unwrap();
			return s;
		});
	};

	export const signIn = async (account: Account.AccountData, session: SessionData) => {
		return attemptAsync(async () => {
			(
				await session.update({
					accountId: account.id
				})
			).unwrap();

			// const universes = (await Universes.getUniverses(account)).unwrap();

			// for (let i = 0; i < universes.length; i++) {
			// 	event.cookies.set(`universe-${i}`, universes[i].id, {
			// 		httpOnly: true,
			// 		domain: DOMAIN ?? '',
			// 		path: '/',
			// 		// expires: new Date(Date.now() + parseInt(SESSION_DURATION ?? '0'))
			// 	});
			// }

			return {
				session
				// universes,
			};
		});
	};
}

// // for drizzle
export const _sessionTable = Session.Session.table;
