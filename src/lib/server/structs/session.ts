import { attemptAsync } from 'ts-utils/check';
import { Struct } from 'drizzle-struct/back-end';
import { integer, text } from 'drizzle-orm/pg-core';
import { Account } from './account';

const { DOMAIN, SESSION_DURATION } = process.env;

interface RequestEvent {
	cookies: {
		get: (name: string) => string | undefined;
		set: (
			name: string,
			value: string,
			options: {
				httpOnly: boolean;
				domain: string;
				sameSite: 'none';
				path: string;
				expires: Date;
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
		}
	});

	export type SessionData = typeof Session.sample;

	export const getSession = (event: RequestEvent) => {
		return attemptAsync(async () => {
			const id = event.cookies.get('ssid');
			console.log('sessionid', id);

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

				event.cookies.set('ssid', session.id, {
					httpOnly: true,
					domain: DOMAIN ?? '',
					sameSite: 'none',
					path: '/',
					expires: new Date(Date.now() + parseInt(SESSION_DURATION ?? '0'))
				});

				// event.headers.set('cookie', `ssid=${session.id}; Domain=${DOMAIN}; Path=/; SameSite=None; Secure`);

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
}

// // for drizzle
export const _sessionTable = Session.Session.table;
