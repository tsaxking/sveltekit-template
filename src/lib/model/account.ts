/**
 * @fileoverview Client-side account models and helpers built on Struct.
 *
 * Provides typed access to account-related structs (account, account_info,
 * account_notification) plus convenience helpers for searches, notifications,
 * and session operations.
 *
 * @example
 * // Load current account and subscribe
 * import { Account } from '$lib/model/account';
 * const self = Account.getSelf();
 * self.subscribe((v) => console.log('current user', v.data.username));
 */
import { attemptAsync } from 'ts-utils/check';
import { sse } from '$lib/services/sse';
import {
	Struct,
	StructData,
	SingleWritable,
	DataArr,
	type GlobalCols
} from '$lib/services/struct/index';
import { browser } from '$app/environment';
import { modalTarget, rawModal } from '$lib/utils/prompts';
import { mount } from 'svelte';
import AccountSearch from '$lib/components/account/AccountSearch.svelte';
import * as remote from '$lib/remotes/account.remote';

/**
 * Account-related models and client helpers.
 */
export namespace Account {
	/**
	 * Struct for accounts.
	 *
	 * @property {string} username - Unique user handle.
	 * @property {string} firstName - Given name.
	 * @property {string} lastName - Family name.
	 * @property {string} email - Contact email.
	 * @property {boolean} verified - Whether the email is verified.
	 * @property {string} lastLogin - ISO timestamp of last login.
	 */
	export const Account = new Struct({
		name: 'account',
		structure: {
			/** Unique user handle. */
			username: 'string',
			// key: 'string',
			// salt: 'string',
			/** Given name. */
			firstName: 'string',
			/** Family name. */
			lastName: 'string',
			/** Contact email. */
			email: 'string',
			// picture: 'string',
			/** Email verification state. */
			verified: 'boolean',
			/** ISO timestamp for last login. */
			lastLogin: 'string'
			// verification: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for accounts. */
	export type AccountData = StructData<typeof Account.data.structure>;
	/** Writable array of account records. */
	export type AccountArr = DataArr<typeof Account.data.structure>;

	/**
	 * Struct for profile details associated with an account.
	 *
	 * @property {string} accountId - Owner account id.
	 * @property {string} viewOnline - Public display name.
	 * @property {string} picture - Avatar URL.
	 * @property {string} bio - Profile bio text.
	 * @property {string} website - Website URL.
	 * @property {string} socials - Serialized social links.
	 * @property {string} theme - Preferred UI theme.
	 */
	export const AccountInfo = new Struct({
		name: 'account_info',
		structure: {
			/** Owner account id. */
			accountId: 'string',
			/** Public display name. */
			viewOnline: 'string',
			/** Avatar URL. */
			picture: 'string',
			/** Profile bio text. */
			bio: 'string',
			/** Website URL. */
			website: 'string',
			/** Serialized social links. */
			socials: 'string',
			/** Preferred UI theme. */
			theme: 'string'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for account info including global columns. */
	export type AccountInfoData = StructData<typeof AccountInfo.data.structure & GlobalCols>;

	/**
	 * Struct for account notifications.
	 *
	 * @property {string} accountId - Recipient account id.
	 * @property {string} title - Notification title.
	 * @property {string} severity - Severity label (e.g. info, success).
	 * @property {string} message - Notification message body.
	 * @property {string} iconType - Icon provider/type.
	 * @property {string} icon - Icon name.
	 * @property {string} link - Optional URL.
	 * @property {boolean} read - Read status.
	 */
	export const AccountNotification = new Struct({
		name: 'account_notification',
		structure: {
			/** Recipient account id. */
			accountId: 'string',
			/** Notification title. */
			title: 'string',
			/** Severity label. */
			severity: 'string',
			/** Message body. */
			message: 'string',
			/** Icon provider/type. */
			iconType: 'string',
			/** Icon name. */
			icon: 'string',
			/** Optional URL to link. */
			link: 'string',
			/** Read status. */
			read: 'boolean'
		},
		socket: sse,
		browser
	});

	/** Struct data shape for account notifications. */
	export type AccountNotificationData = StructData<typeof AccountNotification.data.structure>;
	/** Writable array of notifications. */
	export type AccountNotificationArr = DataArr<typeof AccountNotification.data.structure>;

	/**
	 * Singleton writable for the current account.
	 *
	 * Defaults to a "Guest" account until replaced by server state.
	 */
	export const self = new SingleWritable(
		Account.Generator({
			username: 'Guest',
			// key: '',
			// salt: '',
			firstName: 'Guest',
			lastName: '',
			email: '',
			verified: false,
			// verification: '',
			id: 'guest',
			updated: new Date().toISOString(),
			created: new Date().toISOString(),
			archived: false,
			attributes: '[]',
			lifetime: 0,
			canUpdate: false,
			lastLogin: new Date().toISOString()
		})
	);

	/**
	 * Returns the singleton writable for the current account.
	 */
	export const getSelf = (): SingleWritable<typeof Account.data.structure> => {
		if (browser) {
			remote.self().then((res) => {
				self.set(Account.Generator(res));
			});
		}
		return self;
	};

	const notifications = AccountNotification.arr();
	let notifSubbed = false;

	/**
	 * Fetches the current account's notifications.
	 *
	 * @param config - Pagination options.
	 * @example
	 * const notifs = Account.getNotifs({ limit: 10, page: 0 });
	 */
	export const getNotifs = (config?: { limit: number; page: number }) => {
		if (notifSubbed) {
			return notifications;
		}
		notifSubbed = true;
		remote
			.getNotifications({
				...config
			})
			.then((res) => {
				notifications.set(
					res.map((d) =>
						AccountNotification.Generator({
							...d,
							created: d.created,
							updated: d.updated
						})
					)
				);
			});

		AccountNotification.on('update', () => notifications.inform());
		AccountNotification.on('new', (notif) => {
			notifications.set([notif, ...notifications.data]);
		});
		AccountNotification.on('delete', (notif) => {
			notifications.set(notifications.data.filter((n) => n.data.id !== notif.data.id));
		});

		return notifications;
	};

	/**
	 * Checks whether a username already exists.
	 */
	export const usernameExists = (username: string) => {
		return attemptAsync(async () => {
			return remote.usernameExists({
				username
			});
		});
	};

	/**
	 * Searches accounts with pagination.
	 *
	 * @param query - Search string.
	 * @param config - Pagination config.
	 */
	export const search = (
		query: string,
		config: {
			limit: number;
			page: number;
		} = {
			limit: 25,
			page: 0
		}
	) => {
		const w = Account.arr();
		remote
			.search({
				query,
				limit: config.limit,
				page: config.page
			})
			.then((res) => {
				w.set(res.map((d) => Account.Generator(d)));
			});
		return w;
	};

	/**
	 * Opens a modal to select an account.
	 *
	 * @param config - Optional filter to constrain visible accounts.
	 * @example
	 * const account = await Account.searchAccountsModal({
	 *   filter: (a) => a.data.verified
	 * });
	 */
	export const searchAccountsModal = (config?: { filter: (account: AccountData) => boolean }) => {
		return new Promise<AccountData | null>((resolve, reject) => {
			if (!modalTarget) return reject('Cannot show prompt in non-browser environment');

			const modal = rawModal('Select Account', [], (target) =>
				mount(AccountSearch, {
					target,
					props: {
						onselect: (account) => {
							resolve(account);
							modal.hide();
						},
						filter: config?.filter
					}
				})
			);
			modal.show();
		});
	};

	/**
	 * Signs out the current session.
	 */
	export const signOut = () => {
		return attemptAsync(async () => {
			return fetch('/api/account/sign-out', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: '{}'
			});
		});
	};

	/**
	 * Signs out a specific session id.
	 */
	export const signOutOfSession = (sessionId: string) => {
		return attemptAsync(async () => {
			return fetch('/api/account/sign-out', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ sessionId })
			});
		});
	};
}
