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
import { z } from 'zod';
import { modalTarget, rawModal } from '$lib/utils/prompts';
import { mount } from 'svelte';
import AccountSearch from '$lib/components/account/AccountSearch.svelte';

export namespace Account {
	export const Account = new Struct({
		name: 'account',
		structure: {
			username: 'string',
			// key: 'string',
			// salt: 'string',
			firstName: 'string',
			lastName: 'string',
			email: 'string',
			// picture: 'string',
			verified: 'boolean',
			lastLogin: 'string'
			// verification: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountData = StructData<typeof Account.data.structure>;
	export type AccountArr = DataArr<typeof Account.data.structure>;

	export const AccountInfo = new Struct({
		name: 'account_info',
		structure: {
			accountId: 'string',
			viewOnline: 'string',
			picture: 'string',
			bio: 'string',
			website: 'string',
			socials: 'string',
			theme: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountInfoData = StructData<typeof AccountInfo.data.structure & GlobalCols>;

	export const AccountNotification = new Struct({
		name: 'account_notification',
		structure: {
			accountId: 'string',
			title: 'string',
			severity: 'string',
			message: 'string',
			iconType: 'string',
			icon: 'string',
			link: 'string',
			read: 'boolean'
		},
		socket: sse,
		browser,
		log: true
	});

	export type AccountNotificationData = StructData<typeof AccountNotification.data.structure>;
	export type AccountNotificationArr = DataArr<typeof AccountNotification.data.structure>;

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

	export const getSelf = (): SingleWritable<typeof Account.data.structure> => {
		attemptAsync(async () => {
			const data = await Account.send('self', {}, Account.getZodSchema());
			const account = data.unwrap();
			self.update((d) => {
				d.set(account);
				return d;
			});
		});
		return self;
	};

	export const getNotifs = (/*limit: number, offset: number*/) => {
		return AccountNotification.query(
			'get-own-notifs',
			{},
			{
				asStream: false,
				satisfies: (d) => d.data.accountId === self.get().data.id
			}
		);
	};

	export const getUsersFromUniverse = (universe: string) => {
		return Account.query(
			'from-universe',
			{
				universe
			},
			{
				asStream: false,
				satisfies: () => false
			}
		);
	};

	export const usernameExists = (username: string) => {
		return Account.send('username-exists', { username }, z.boolean());
	};

	export const search = (
		query: string,
		config: {
			limit: number;
			offset: number;
		} = {
			limit: 25,
			offset: 0
		}
	) => {
		return Account.query(
			'search',
			{
				query,
				...config
			},
			{
				asStream: false,
				satisfies: () => false
			}
		);
	};

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
}
