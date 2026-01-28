/**
 * @fileoverview Session struct and helpers for cookie-based session tracking.
 *
 * Provides session creation, lookup, sign-in, and sign-out utilities based
 * on request cookies.
 *
 * @example
 * import { Session } from '$lib/server/structs/session';
 * const session = await Session.getSession(event).unwrap();
 */
import { attemptAsync } from 'ts-utils/check';
import { Struct } from 'drizzle-struct';
import { integer, text } from 'drizzle-orm/pg-core';
import { Account } from './account';
import { domain, config } from '../utils/env';

/**
 * Minimal request event interface for session helpers.
 *
 * @property {object} cookies - Cookie getter/setter.
 * @property {(name: string) => string | undefined} cookies.get - Cookie getter.
 * @property {(name: string, value: string, options: { httpOnly?: boolean; domain?: string; sameSite?: 'none'; path: string; expires?: Date }) => void} cookies.set - Cookie setter.
 * @property {Request} request - Incoming request.
 */
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
	/**
	 * Public domain for the session cookie.
	 */
	const PUBLIC_DOMAIN = domain({
		port: false,
		protocol: false
	});
	/**
	 * Session lifetime in milliseconds.
	 */
	const SESSION_DURATION = config.sessions.duration;

	/**
	 * Active session record.
	 *
	 * @property {string} accountId - Account ID for signed-in users.
	 * @property {string} ip - Client IP address.
	 * @property {string} userAgent - User agent string.
	 * @property {number} requests - Request counter.
	 * @property {string} prevUrl - Previous visited URL.
	 * @property {string} fingerprint - Client fingerprint hash.
	 * @property {number} tabs - Active tab count.
	 */
	export const Session = new Struct({
		name: 'session',
		structure: {
			/** Account ID for signed-in users. */
			accountId: text('account_id').notNull(),
			/** Client IP address. */
			ip: text('ip').notNull(),
			/** User agent string. */
			userAgent: text('user_agent').notNull(),
			/** Request counter. */
			requests: integer('requests').notNull(),
			/** Previous visited URL. */
			prevUrl: text('prev_url').notNull(),
			/** Client fingerprint hash. */
			fingerprint: text('fingerprint').notNull().default(''),
			/** Active tab count. */
			tabs: integer('tabs').notNull().default(0)
		},
		safes: ['fingerprint'],
		lifetime: SESSION_DURATION
	});

	export type SessionData = typeof Session.sample;

	/**
	 * Retrieves or creates a session based on cookies.
	 *
	 * @param {RequestEvent} event - Request/cookie wrapper.
	 */
	export const getSession = (event: RequestEvent) => {
		return attemptAsync(async () => {
			// TODO: will eventually split domain later once we use the same cookie id as session id upon creation
			const id = event.cookies.get('ssid_' + PUBLIC_DOMAIN);

			const create = async () => {
				const ip =
					event.request.headers.get('Client-IP') ??
					event.request.headers.get('X-Forwarded-For') ??
					event.request.headers.get('X-Real-IP') ??
					'';

				const userAgent = event.request.headers.get('User-Agent') ?? '';

				const session = await Session.new({
					accountId: '',
					ip,
					userAgent,
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

	/**
	 * Loads the account associated with the session.
	 *
	 * @param {SessionData} session - Session to resolve.
	 */
	export const getAccount = (session: SessionData) => {
		return attemptAsync(async () => {
			const s = (await Account.Account.fromId(session.data.accountId)).unwrap();
			return s;
		});
	};

	/**
	 * Associates a session with an account and updates last login.
	 *
	 * @param {Account.AccountData} account - Account to sign in.
	 * @param {SessionData} session - Session to update.
	 */
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
			return {
				session
				// universes,
			};
		});
	};

	/**
	 * Signs a session out by clearing the account ID.
	 *
	 * @param {SessionData} session - Session to update.
	 */
	export const signOut = (session: SessionData) => {
		return session.update({
			accountId: ''
		});
	};
}

// // for drizzle
export const _sessionTable = Session.Session.table;
