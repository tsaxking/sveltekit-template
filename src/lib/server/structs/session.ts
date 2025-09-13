import { attemptAsync } from 'ts-utils/check';
import { Struct } from 'drizzle-struct/back-end';
import { integer, text } from 'drizzle-orm/pg-core';
import { Account } from './account';
import { domain, num } from '../utils/env';

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
	request: Request;
}

export namespace Session {
	const PUBLIC_DOMAIN = domain({
		port: false,
		protocol: false
	});
	const SESSION_DURATION = num('SESSION_DURATION', true);

	export const Session = new Struct({
		name: 'session',
		structure: {
			accountId: text('account_id').notNull(),
			ip: text('ip').notNull(),
			userAgent: text('user_agent').notNull(),
			requests: integer('requests').notNull(),
			prevUrl: text('prev_url').notNull(),
			fingerprint: text('fingerprint').notNull().default(''),
			tabs: integer('tabs').notNull().default(0)
		},
		frontend: false,
		safes: ['fingerprint'],
		lifetime: SESSION_DURATION,
	});

	export type SessionData = typeof Session.sample;

	export const getSession = (event: RequestEvent) => {
		return attemptAsync(async () => {
			// TODO: will eventually split domain later once we use the same cookie id as session id upon creation
			const id = event.cookies.get('ssid_' + PUBLIC_DOMAIN);

			const create = async () => {
				const session = await Session.new({
					accountId: '',
					ip: '',
					userAgent: '',
					requests: 0,
					prevUrl: '',
					fingerprint: '',
					tabs: 0
				}).unwrap();

				event.cookies.set('ssid_' + PUBLIC_DOMAIN, session.id, {
					httpOnly: false,
					domain: PUBLIC_DOMAIN ?? '',
					path: '/',
					expires: new Date(Date.now() + SESSION_DURATION)
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
			await session
				.update({
					accountId: account.id
				})
				.unwrap();
			await account.update({
				lastLogin: new Date().toISOString()
			});

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
