import { attemptAsync } from 'ts-utils/check';
import { sse } from '$lib/services/sse';
import { Struct, StructData, SingleWritable, DataArr } from 'drizzle-struct/front-end';
import { browser } from '$app/environment';
import { z } from 'zod';

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
			picture: 'string',
			verified: 'boolean',
			lastLogin: 'string'
			// verification: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountData = StructData<typeof Account.data.structure>;
	export type AccountArr = DataArr<typeof Account.data.structure>;

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
			picture: '',
			verified: false,
			// verification: '',
			id: 'guest',
			updated: '0',
			created: '0',
			archived: false,
			attributes: '[]',
			lifetime: 0,
			canUpdate: false
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
}
