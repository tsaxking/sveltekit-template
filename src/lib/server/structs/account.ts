/**
 * @fileoverview Account domain structs, helpers, and notification utilities.
 *
 * This module defines the primary account struct and related entities such as
 * account settings, admin/developer memberships, account info, notifications,
 * and password reset tokens. It also provides helper functions for hashing,
 * querying, and notifications.
 *
 * @example
 * import { Account } from '$lib/server/structs/account';
 * const account = await Account.createAccount({
 *   username: 'jdoe',
 *   email: 'jdoe@example.com',
 *   firstName: 'Jane',
 *   lastName: 'Doe',
 *   password: 'S3cure!'
 * }).unwrap();
 */
import { boolean, text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import { uuid } from '../utils/uuid';
import { attempt, attemptAsync } from 'ts-utils/check';
import crypto from 'crypto';
import { DB } from '../db';
import { eq, or, ilike } from 'drizzle-orm';
import type { Notification } from '../../types/notification';
import { Session } from './session';
import { sse } from '../services/sse';
import { sendEmail } from '../services/email';
import type { Icon } from '../../types/icons';
import { Permissions } from './permissions';
import { config, domain } from '../utils/env';
import structRegistry from '../services/struct-registry';
import { DataAction, PropertyAction } from '../../types/struct';

export namespace Account {
	/**
	 * Core account record.
	 *
	 * @property {string} username - Unique public username.
	 * @property {string} key - Password hash.
	 * @property {string} salt - Password salt.
	 * @property {string} firstName - First name.
	 * @property {string} lastName - Last name.
	 * @property {string} email - Unique email address.
	 * @property {boolean} verified - Email verification status.
	 * @property {string} verification - Verification token.
	 * @property {string} lastLogin - ISO timestamp of the last login.
	 */
	export const Account = new Struct({
		name: 'account',
		structure: {
			/** Unique public username. */
			username: text('username').notNull().unique(),
			/** Password hash. */
			key: text('key').notNull(),
			/** Password salt. */
			salt: text('salt').notNull(),
			/** First name. */
			firstName: text('first_name').notNull(),
			/** Last name. */
			lastName: text('last_name').notNull(),
			/** Unique email address. */
			email: text('email').notNull().unique(),
			/** Email verification status. */
			verified: boolean('verified').notNull(),
			/** Verification token. */
			verification: text('verification').notNull(),
			/** ISO timestamp of last login. */
			lastLogin: text('last_login').notNull().default('')
		},
		generators: {
			id: () => (uuid() + uuid() + uuid() + uuid()).replace(/-/g, '')
		},
		safes: ['key', 'salt', 'verification']
	});

	structRegistry.register(Account);

	Account.on('delete', async (a) => {
		Admins.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((a) => a.delete());
		Developers.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((a) => a.delete());
		AccountNotification.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((a) => a.delete());
		Settings.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((a) => a.delete());
		PasswordReset.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((a) => a.delete());
		Session.Session.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe((s) => s.delete());
		AccountInfo.get(
			{ accountId: a.id },
			{
				type: 'stream'
			}
		).pipe(async (a) => {
			const versions = await a.getVersions().unwrapOr([]);
			await Promise.all(versions.map((v) => v.delete()));
			a.delete();
		});
		Permissions.RoleAccount.get(
			{ account: a.id },
			{
				type: 'stream'
			}
		).pipe((ra) => ra.delete());
		Permissions.AccountRuleset.get(
			{ account: a.id },
			{
				type: 'stream'
			}
		).pipe((ar) => ar.delete());
	});

	/**
	 * Per-account key/value settings.
	 *
	 * @property {string} accountId - Owning account ID.
	 * @property {string} setting - Setting key.
	 * @property {string} value - Setting value.
	 */
	export const Settings = new Struct({
		name: 'account_settings',
		structure: {
			/** Owning account ID. */
			accountId: text('account_id').notNull(),
			/** Setting key. */
			setting: text('setting').notNull(),
			/** Setting value. */
			value: text('value').notNull()
		}
	});

	structRegistry
		.register(Settings)
		.bypass(DataAction.Delete, (account, item) => account.id === item?.data.accountId)
		.bypass(PropertyAction.Update, (account, item) => account.id === item?.data.accountId)
		.bypass(PropertyAction.Read, (account, item) => account.id === item?.data.accountId)
		.bypass(DataAction.Create, (account) => account.id === account.id);

	/**
	 * Membership for admin accounts.
	 *
	 * @property {string} accountId - Account ID of the admin.
	 */
	export const Admins = new Struct({
		name: 'admins',
		structure: {
			/** Account ID of the admin. */
			accountId: text('account_id').notNull().unique()
		}
	});

	/**
	 * Checks whether an account is an admin.
	 *
	 * @param {AccountData} account - Account to check.
	 */
	export const isAdmin = (account: AccountData) => {
		return attemptAsync(async () => {
			return (
				(
					await Admins.get(
						{ accountId: account.id },
						{
							type: 'count'
						}
					)
				).unwrap() > 0
			);
		});
	};

	/**
	 * Returns all admin accounts.
	 */
	export const getAdmins = () => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Admins.table)
				.innerJoin(Account.table, eq(Account.table.id, Admins.table.accountId));
			return res.map((a) => Account.Generator(a.account));
		});
	};

	/**
	 * Membership for developer accounts.
	 *
	 * @property {string} accountId - Account ID of the developer.
	 */
	export const Developers = new Struct({
		name: 'developers',
		structure: {
			/** Account ID of the developer. */
			accountId: text('account_id').notNull().unique()
		}
	});

	/**
	 * Returns all developer accounts.
	 */
	export const getDevelopers = () => {
		return attemptAsync(async () => {
			const res = await DB.select()
				.from(Developers.table)
				.innerJoin(Account.table, eq(Account.table.id, Developers.table.accountId));
			return res.map((a) => Account.Generator(a.account));
		});
	};

	/**
	 * Checks whether an account is a developer.
	 *
	 * @param {AccountData} account - Account to check.
	 */
	export const isDeveloper = (account: AccountData) => {
		return attemptAsync(async () => {
			return (
				(
					await Developers.get(
						{ accountId: account.id },
						{
							type: 'count'
						}
					)
				).unwrap() > 0
			);
		});
	};
	export type AccountData = typeof Account.sample;

	/**
	 * Extended account profile info (versioned).
	 *
	 * @property {string} accountId - Owning account ID.
	 * @property {'all'|'friends'|'none'} viewOnline - Online visibility.
	 * @property {string} picture - Profile image URL.
	 * @property {string} bio - Short biography.
	 * @property {string} website - Personal website URL.
	 * @property {string} socials - Serialized social links.
	 * @property {'default'|'dark'|'light'} theme - UI theme preference.
	 */
	export const AccountInfo = new Struct({
		name: 'account_info',
		structure: {
			/** Owning account ID. */
			accountId: text('account_id').notNull(),
			/** Online visibility setting. */
			viewOnline: text('view_online').notNull().default('all'), // allow others to see if user is online
			/** Profile image URL. */
			picture: text('picture').notNull(),
			/** Short biography. */
			bio: text('bio').notNull(),
			/** Personal website URL. */
			website: text('website').notNull(),
			/** Serialized social links. */
			socials: text('socials').notNull().default(''),
			/** Theme preference. */
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

	structRegistry.register(AccountInfo);

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

	/**
	 * Determines whether an account is currently online.
	 *
	 * @param {string} accountId - Account ID to check.
	 */
	export const isOnline = (accountId: string) => {
		return attemptAsync(async () => {
			const account = await Account.fromId(accountId).unwrap();
			if (!account) throw new Error('Account not found');
			const info = await getAccountInfo(account).unwrap();
			if (info.data.viewOnline !== 'all') return false;
			let isOnline = false;
			const stream = Session.Session.get(
				{ accountId },
				{
					type: 'stream'
				}
			);
			await stream.pipe((s) => {
				if (s.data.tabs > 0) {
					isOnline = true;
					stream.end();
				}
			});
			return isOnline;
		});
	};

	/**
	 * Retrieves account info, creating a default record if missing.
	 *
	 * @param {AccountData} account - Owning account.
	 */
	export const getAccountInfo = (account: AccountData) => {
		return attemptAsync(async () => {
			const info = await AccountInfo.get(
				{ accountId: account.id },
				{
					type: 'single'
				}
			).unwrap();
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

	/**
	 * Notification record for an account.
	 *
	 * @property {string} accountId - Recipient account ID.
	 * @property {string} title - Notification title.
	 * @property {string} severity - Severity level.
	 * @property {string} message - Notification body.
	 * @property {string} icon - Icon name.
	 * @property {string} iconType - Icon set type.
	 * @property {string} link - Associated link.
	 * @property {boolean} read - Read/unread state.
	 */
	export const AccountNotification = new Struct({
		name: 'account_notification',
		structure: {
			/** Recipient account ID. */
			accountId: text('account_id').notNull(),
			/** Notification title. */
			title: text('title').notNull(),
			/** Severity level. */
			severity: text('severity').notNull(),
			/** Notification body. */
			message: text('message').notNull(),
			/** Icon name. */
			icon: text('icon').notNull(),
			/** Icon set type. */
			iconType: text('icon_type').notNull().default(''),
			/** Associated link. */
			link: text('link').notNull(),
			/** Read/unread state. */
			read: boolean('read').notNull()
		}
	});

	structRegistry
		.register(AccountNotification)
		.bypass(DataAction.Delete, (account, item) => account.id === item?.data.accountId)
		.bypass(PropertyAction.Update, (account, item) => account.id === item?.data.accountId)
		.bypass(PropertyAction.Read, (account, item) => account.id === item?.data.accountId);

	/**
	 * Password reset link lifetime in milliseconds.
	 */
	const PASSWORD_REQUEST_LIFETIME = config.sessions.password_request_lifetime;

	/**
	 * Password reset token.
	 *
	 * @property {string} accountId - Owning account ID.
	 * @property {string} expires - ISO timestamp when the token expires.
	 */
	export const PasswordReset = new Struct({
		name: 'password_reset',
		structure: {
			/** Owning account ID. */
			accountId: text('account_id').notNull(),
			/** ISO timestamp when the token expires. */
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

	/**
	 * Generates a new password hash and salt.
	 *
	 * @param {string} password - Plaintext password.
	 */
	export const newHash = (password: string) => {
		return attempt(() => {
			const salt = crypto.randomBytes(32).toString('hex');
			const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
			return { hash, salt };
		});
	};

	/**
	 * Hashes a password using a provided salt.
	 *
	 * @param {string} password - Plaintext password.
	 * @param {string} salt - Salt used for hashing.
	 */
	export const hash = (password: string, salt: string) => {
		return attempt(() => {
			return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
		});
	};

	/**
	 * Creates a new account with hashed credentials.
	 *
	 * @param {{ username: string; email: string; firstName: string; lastName: string; password: string }} data
	 * @param {{ canUpdate?: boolean }} [config] - Optional struct creation config.
	 */
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

	/**
	 * Searches accounts by username or email.
	 *
	 * @param {string} query - Search term.
	 * @param {{ type: 'array'; limit: number; offset: number }} config - Paging config.
	 */
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

	/**
	 * Sends a notification to active sessions via SSE.
	 *
	 * @param {string} accountId - Recipient account ID.
	 * @param {Notification} notification - Notification payload.
	 */
	export const notifyPopup = (accountId: string, notification: Notification) => {
		return attemptAsync(async () => {
			Session.Session.get(
				{ accountId },
				{
					type: 'stream'
				}
			).pipe((s) => sse.fromSession(s.id).notify(notification));
		});
	};

	/**
	 * Persists a notification and sends it over SSE.
	 *
	 * @param {string} accountId - Recipient account ID.
	 * @param {Notification & { icon: Icon; link: string }} notif - Notification payload.
	 */
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

	export const globalNotification = (
		notif: Notification & {
			icon: Icon;
			link: string;
		}
	) => {
		return attemptAsync(async () => {
			const accounts = await DB.select({
				id: Account.table.id
			}).from(Account.table);

			return Promise.all(accounts.map((a) => sendAccountNotif(a.id, notif).unwrap()));
		});
	};

	/**
	 * Creates a new account from OAuth user info.
	 *
	 * @param {{ email?: string | null; given_name?: string | null; family_name?: string | null }} data
	 */
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

	/**
	 * Streams all settings for the given account.
	 *
	 * @param {string} accountId - Account ID.
	 */
	export const getSettings = (accountId: string) => {
		return Settings.get(
			{ accountId },
			{
				type: 'stream'
			}
		).await();
	};

	/**
	 * Creates a password reset token and sends the reset email.
	 *
	 * @param {AccountData} account - Account requesting a reset.
	 */
	export const requestPasswordReset = (account: AccountData) => {
		return attemptAsync(async () => {
			PasswordReset.get(
				{ accountId: account.id },
				{
					type: 'stream'
				}
			).pipe((pr) => pr.delete());

			const pr = (
				await PasswordReset.new({
					expires: new Date(Date.now() + PASSWORD_REQUEST_LIFETIME).toISOString(), // gets overwritten by generator
					accountId: account.id
				})
			).unwrap();

			const email = account.data.email;

			await sendEmail({
				type: 'forgot-password',
				to: email,
				data: {
					link: `${domain({
						port: false,
						protocol: true
					})}/account/password-reset/${pr.id}`,
					supportEmail: config.email.support_email
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
