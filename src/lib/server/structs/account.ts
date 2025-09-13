import { boolean, text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import { uuid } from '../utils/uuid';
import { attempt, attemptAsync } from 'ts-utils/check';
import crypto from 'crypto';
import { DB } from '../db';
import { eq, or, ilike } from 'drizzle-orm';
import type { Notification } from '../../types/notification';
import { Session } from './session';
import { sse } from '../services/sse';
import { DataAction, PropertyAction } from 'drizzle-struct/types';
// import { Universes } from './universe';
import { sendEmail } from '../services/email';
import type { Icon } from '../../types/icons';
import { z } from 'zod';
import { Permissions } from './permissions';
import { QueryListener } from '../services/struct-listeners';
import { str, num } from '../utils/env';

export namespace Account {
	export const Account = new Struct({
		name: 'account',
		structure: {
			username: text('username').notNull().unique(),
			key: text('key').notNull(),
			salt: text('salt').notNull(),
			firstName: text('first_name').notNull(),
			lastName: text('last_name').notNull(),
			email: text('email').notNull().unique(),
			verified: boolean('verified').notNull(),
			verification: text('verification').notNull(),
			lastLogin: text('last_login').notNull().default('')
		},
		generators: {
			id: () => (uuid() + uuid() + uuid() + uuid()).replace(/-/g, '')
		},
		safes: ['key', 'salt', 'verification']
	});

	QueryListener.on(
		'search',
		Account,
		z.object({
			query: z.string().min(1).max(255),
			limit: z.number().min(1).max(100).default(10),
			offset: z.number().min(0).default(0)
		}),
		async (event, data) => {
			if (!event.locals.account) {
				throw new Error('Not logged in');
			}

			return searchAccounts(data.query, {
				type: 'array',
				limit: data.limit || 10,
				offset: data.offset || 0
			}).unwrap();
		}
	);

	Account.sendListen('self', async (event) => {
		const session = (await Session.getSession(event)).unwrap();
		const account = (await Session.getAccount(session)).unwrap();
		if (!account) {
			return new Error('Not logged in');
		}
		return account.safe();
	});

	Account.sendListen('username-exists', async (event, data) => {
		const parsed = z
			.object({
				username: z.string().min(1)
			})
			.safeParse(data);

		if (!parsed.success) {
			throw new Error('Invalid data recieved');
		}

		const account = await Account.fromProperty('username', parsed.data.username, {
			type: 'count'
		}).unwrap();

		return account > 0;
	});

	Account.on('delete', async (a) => {
		Admins.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((a) => a.delete());
		Developers.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((a) => a.delete());
		AccountNotification.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((a) => a.delete());
		Settings.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((a) => a.delete());
		PasswordReset.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((a) => a.delete());
		Session.Session.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe((s) => s.delete());
		AccountInfo.fromProperty('accountId', a.id, {
			type: 'stream'
		}).pipe(async (a) => {
			const versions = await a.getVersions().unwrapOr([]);
			await Promise.all(versions.map((v) => v.delete()));
			a.delete();
		});
		Permissions.RoleAccount.fromProperty('account', a.id, {
			type: 'stream'
		}).pipe((ra) => ra.delete());
		Permissions.AccountRuleset.fromProperty('account', a.id, {
			type: 'stream'
		}).pipe((ar) => ar.delete());
	});

	export const Admins = new Struct({
		name: 'admins',
		structure: {
			accountId: text('account_id').notNull().unique()
		}
	});

	export const isAdmin = (account: AccountData) => {
		return attemptAsync(async () => {
			return (
				(
					await Admins.fromProperty('accountId', account.id, {
						type: 'count'
					})
				).unwrap() > 0
			);
		});
	};

	export const getAdmins = () => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Admins.table)
				.innerJoin(Account.table, eq(Account.table.id, Admins.table.accountId));
			return res.map((a) => Account.Generator(a.account));
		});
	};

	export const Developers = new Struct({
		name: 'developers',
		structure: {
			accountId: text('account_id').notNull().unique()
		}
	});

	export const getDevelopers = () => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Developers.table)
				.innerJoin(Account.table, eq(Account.table.id, Developers.table.accountId));
			return res.map((a) => Account.Generator(a.account));
		});
	};

	export const isDeveloper = (account: AccountData) => {
		return attemptAsync(async () => {
			return (
				(
					await Developers.fromProperty('accountId', account.id, {
						type: 'count'
					})
				).unwrap() > 0
			);
		});
	};
	export type AccountData = typeof Account.sample;

	export const AccountInfo = new Struct({
		name: 'account_info',
		structure: {
			accountId: text('account_id').notNull(),
			viewOnline: text('view_online').notNull().default('all'), // allow others to see if user is online
			picture: text('picture').notNull(),
			bio: text('bio').notNull(),
			website: text('website').notNull(),
			socials: text('socials').notNull().default(''),
			theme: text('theme').notNull().default('default')
		},
		versionHistory: {
			type: 'versions',
			amount: 3
		},
		validators: {
			viewOnline: (e) => typeof e === 'string' && ['all', 'friends', 'none'].includes(e),
			theme: (e) => typeof e === 'string' && ['default', 'dark', 'light'].includes(e)
		}
	});

	export type AccountInfoData = typeof AccountInfo.sample;

	AccountInfo.on('update', ({ from, to }) => {
		if (from.accountId !== to.data.accountId) {
			to.update({
				// reset accountId to the one from the struct
				// you cannot change the accountId of an account info
				accountId: from.accountId
			});
		}
	});

	Account.on('create', (a) => {
		AccountInfo.new({
			accountId: a.id,
			viewOnline: 'all',
			picture: '',
			bio: '',
			website: '',
			socials: '',
			theme: 'default'
		});
	});

	export const isOnline = (accountId: string) => {
		return attemptAsync(async () => {
			const account = await Account.fromId(accountId).unwrap();
			if (!account) throw new Error('Account not found');
			const info = await getAccountInfo(account).unwrap();
			if (info.data.viewOnline !== 'all') return false;
			let isOnline = false;
			const stream = Session.Session.fromProperty('accountId', accountId, {
				type: 'stream'
			});
			await stream.pipe((s) => {
				if (s.data.tabs > 0) {
					isOnline = true;
					stream.end();
				}
			});
			return isOnline;
		});
	};

	export const getAccountInfo = (account: AccountData) => {
		return attemptAsync(async () => {
			const info = await AccountInfo.fromProperty('accountId', account.id, {
				type: 'single'
			}).unwrap();
			if (info) return info;
			return AccountInfo.new({
				accountId: account.id,
				viewOnline: 'all',
				picture: '',
				bio: '',
				website: '',
				socials: '',
				theme: 'default'
			}).unwrap();
		});
	};

	export const AccountNotification = new Struct({
		name: 'account_notification',
		structure: {
			accountId: text('account_id').notNull(),
			title: text('title').notNull(),
			severity: text('severity').notNull(),
			message: text('message').notNull(),
			icon: text('icon').notNull(),
			iconType: text('icon_type').notNull().default(''),
			link: text('link').notNull(),
			read: boolean('read').notNull()
		}
	});

	AccountNotification.bypass(DataAction.Delete, (a, b) => a.id === b?.accountId);
	AccountNotification.bypass(PropertyAction.Update, (a, b) => a.id === b?.accountId);
	AccountNotification.bypass(PropertyAction.Read, (a, b) => a.id === b?.accountId);
	AccountNotification.queryListen('get-own-notifs', async (event) => {
		const session = (await Session.getSession(event)).unwrap();
		const account = (await Session.getAccount(session)).unwrap();

		if (!account) {
			return new Error('Not logged in');
		}

		return AccountNotification.fromProperty('accountId', account.id, {
			type: 'stream'
		});
	});

	export const Settings = new Struct({
		name: 'account_settings',
		structure: {
			accountId: text('account_id').notNull(),
			setting: text('setting').notNull(),
			value: text('value').notNull()
		}
	});

	Settings.bypass('*', (account, setting) => account.id === setting?.accountId);

	const PASSWORD_REQUEST_LIFETIME = num('PASSWORD_REQUEST_LIFETIME', false) || 1000 * 60 * 30;

	export const PasswordReset = new Struct({
		name: 'password_reset',
		structure: {
			accountId: text('account_id').notNull(),
			expires: text('expires').notNull()
		},
		lifetime: PASSWORD_REQUEST_LIFETIME,
		validators: {
			expires: (e) =>
				new Date(String(e)).toString() !== 'Invalid Date' &&
				new Date(String(e)).getTime() > Date.now()
		},
		generators: {
			expires: (): string => new Date(Date.now() + PASSWORD_REQUEST_LIFETIME).toISOString()
		}
	});

	export const newHash = (password: string) => {
		return attempt(() => {
			const salt = crypto.randomBytes(32).toString('hex');
			const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
			return { hash, salt };
		});
	};

	export const hash = (password: string, salt: string) => {
		return attempt(() => {
			return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
		});
	};

	export const createAccount = (
		data: {
			username: string;
			email: string;
			firstName: string;
			lastName: string;
			password: string;
		},
		config?: {
			canUpdate?: boolean;
		}
	) => {
		return attemptAsync(async () => {
			const hash = newHash(data.password).unwrap();
			const verificationId = uuid();
			const account = (
				await Account.new(
					{
						username: data.username,
						email: data.email,
						firstName: data.firstName,
						lastName: data.lastName,
						key: hash.hash,
						salt: hash.salt,
						verified: false,
						verification: verificationId,
						lastLogin: ''
					},
					{
						static: config?.canUpdate
					}
				)
			).unwrap();

			// send verification email

			return account;
		});
	};

	export const searchAccounts = (
		query: string,
		config: {
			type: 'array';
			limit: number;
			offset: number;
		}
	) => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Account.table)
				.where(
					or(
						ilike(Account.table.username, `%${query.toLowerCase()}%`),
						ilike(Account.table.email, `%${query.toLowerCase()}%`)
					)
				)
				.limit(config.limit)
				.offset(config.offset);

			return res.map((a) => Account.Generator(a));
		});
	};

	export const notifyPopup = (accountId: string, notification: Notification) => {
		return attemptAsync(async () => {
			Session.Session.fromProperty('accountId', accountId, {
				type: 'stream'
			}).pipe((s) => sse.fromSession(s.id).notify(notification));
		});
	};

	export const sendAccountNotif = (
		accountId: string,
		notif: Notification & {
			icon: Icon;
			link: string;
		}
	) => {
		notifyPopup(accountId, notif);
		return AccountNotification.new({
			title: notif.title,
			severity: notif.severity,
			message: notif.message,
			accountId: accountId,
			icon: notif.icon.name,
			iconType: notif.icon.type,
			link: notif.link,
			read: false
		});
	};

	export const createAccountFromOauth = (data: {
		email?: string | null;
		given_name?: string | null;
		family_name?: string | null;
	}) => {
		return attemptAsync(async () => {
			// const oauth2 = google.oauth2({
			// 	auth: client,
			// 	version: 'v2',
			// });
			// const userInfo = await oauth2.userinfo.get();
			const email = data.email;
			const firstName = data.given_name;
			const lastName = data.family_name;

			if (!email) throw new Error('No email provided');
			if (!firstName) throw new Error('No first name provided');
			if (!lastName) throw new Error('No last name provided');

			const username = email.split('@')[0];
			const verificationId = uuid();

			// send verification email

			// hash and salt are not needed as the authentication is handled by google in this case
			return (
				await Account.new({
					username,
					email,
					firstName,
					lastName,
					key: '',
					salt: '',
					verified: false,
					verification: verificationId,
					lastLogin: ''
				})
			).unwrap();
		});
	};

	export const getSettings = (accountId: string) => {
		return Settings.fromProperty('accountId', accountId, {
			type: 'stream'
		}).await();
	};

	export const requestPasswordReset = (account: AccountData) => {
		return attemptAsync(async () => {
			PasswordReset.fromProperty('accountId', account.id, {
				type: 'stream'
			}).pipe((pr) => pr.delete());

			const pr = (
				await PasswordReset.new({
					expires: new Date(Date.now() + PASSWORD_REQUEST_LIFETIME).toISOString(), // gets overwritten by generator
					accountId: account.id
				})
			).unwrap();

			const email = account.data.email;

			sendEmail({
				type: 'forgot-password',
				to: email,
				data: {
					link: `/account/password-reset/${pr.id}`,
					supportEmail: str('SUPPORT_EMAIL', false) || ''
				},
				subject: 'Password Reset Request'
			}).unwrap();

			(
				await sendAccountNotif(account.id, {
					title: 'Password Reset Request',
					message: 'A password reset link has been sent to your email',
					severity: 'warning',
					icon: {
						name: 'lock',
						type: 'material-icons'
					},
					link: ''
				})
			).unwrap();
		});
	};
}

// for drizzle
export const _accountTable = Account.Account.table;
// export const _oauth2TokensTable = Account.OAuth2Tokens.table;
export const _adminsTable = Account.Admins.table;
export const _developersTable = Account.Developers.table;
export const _accountNotificationTable = Account.AccountNotification.table;
export const _accountSettings = Account.Settings.table;
export const _passwordReset = Account.PasswordReset.table;
export const _accountInfo = Account.AccountInfo.table;
export const _accountInfoVersionHistory = Account.AccountInfo.versionTable;
