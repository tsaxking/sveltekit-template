import { sse } from '$lib/utils/sse';
import { Struct, StructData, DataArr } from 'drizzle-struct/front-end';
import { attemptAsync } from 'ts-utils/check';
import { Account } from './account';
import { browser } from '$app/environment';
import { Permissions } from './permissions';

export namespace Universes {
	export const Universe = new Struct({
		name: 'universe',
		socket: sse,
		structure: {
			name: 'string',
			description: 'string',
			public: 'boolean'
		},
		browser
	});

	export type UniverseData = StructData<typeof Universe.data.structure>;
	export type UniverseArr = DataArr<typeof Universe.data.structure>;

	export const UniverseInvites = new Struct({
		name: 'universe_invite',
		socket: sse,
		structure: {
			universe: 'string',
			account: 'string',
			inviter: 'string'
		},
		browser
	});

	export type UniverseInviteData = StructData<typeof UniverseInvites.data.structure>;
	export type UniverseInviteArr = DataArr<typeof UniverseInvites.data.structure>;

	export const acceptInvite = async (invite: UniverseInviteData) => {
		return attemptAsync(async () => {});
	};

	export const declineInvite = async (invite: UniverseInviteData) => {
		return attemptAsync(async () => {});
	};

	export const getMembers = (universe: UniverseData) => {
		return Account.Account.query(
			'universe-members',
			{
				universe: universe.data.id
			},
			{
				asStream: false,
				satisfies: (_) => false // no auto update but it's fine 😢
			}
		);
	};

	export const setUniverse = (universe: string) => {
		Struct.headers.set('universe', universe);
	};

	export const invite = async (user: string) => {
		return UniverseInvites.call('invite', {
			user,
			universe: Struct.headers.get('universe')
		});
	};

	export const getRoles = (universe: UniverseData) => {
		// Permissions.Role.on('new', (role) => {
		// 	console.log('Created new role...', role);
		// 	if (role.data.universe === universe.data.id) {
		// 		console.log('Recieved new role:', role);
		// 	}
		// });
		return Permissions.Role.fromProperty('universe', universe.data.id || '', false);
	};
}
