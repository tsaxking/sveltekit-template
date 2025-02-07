import { attemptAsync } from 'ts-utils/check';
import { sse } from '$lib/utils/sse';
import {
	Struct,
	type PartialStructable,
	type Structable,
	type GlobalCols,
	StructData,
	SingleWritable,
	DataArr
} from 'drizzle-struct/front-end';
import { Requests } from '$lib/utils/requests';
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
			verified: 'boolean'
			// verification: 'string'
		},
		socket: sse,
		browser
	});

	export type AccountData = StructData<typeof Account.data.structure>;

	export const AccountNotification = new Struct({
		name: 'account_notification',
		structure: {
			accountId: 'string',
			title: 'string',
			severity: 'string',
			message: 'string',
			icon: 'string',
			link: 'string',
			read: 'boolean'
		},
		socket: sse,
		browser
	});

	export type AccountNotificationData = StructData<typeof AccountNotification.data.structure>;

	const self = new SingleWritable(
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
			universe: '',
			attributes: '[]',
			lifetime: 0,
			canUpdate: false
		})
	);

	export const getSelf = (): SingleWritable<typeof Account.data.structure> => {
		attemptAsync(async () => {
			const data = await Account.send('self', {}, Account.getZodSchema());
			self.update((d) => {
				d.set(data.unwrap()); // The program may not like this
				return d;
			});
		});
		return self;
	};

	export const getNotifs = (limit: number, offset: number) => {
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
}
