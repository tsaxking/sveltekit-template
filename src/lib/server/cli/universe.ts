/* eslint-disable @typescript-eslint/no-explicit-any */
import { Folder, Action } from './utils';
import { selectData, structActions } from './struct';
import { Universes } from '../structs/universe';
import terminal from '../utils/terminal';
import { attemptAsync } from 'ts-utils/check';
import { selectAccount } from './accounts';
import { Logs } from '../structs/log';

export const selectUniverse = async () => {
	return attemptAsync(async () => {
		const universes = (
			await Universes.Universe.all({
				type: 'stream'
			}).await()
		).unwrap();

		const u = (
			await selectData(universes as any, 'Select a universe', {
				omit: ['id', 'verification', 'key', 'salt', 'attributes', 'universe']
			})
		).unwrap();

		if (typeof u === 'undefined') return terminal.log('Cancelled');

		const universe = universes[u];

		return universe;
	});
};

export const selectMember = async (universe: Universes.UniverseData) => {
	return attemptAsync(async () => {
		const members = (await Universes.getMembers(universe)).unwrap();
		const m = (
			await selectData(members as any, 'Select a member', {
				omit: ['id', 'verification', 'key', 'salt', 'attributes', 'universe']
			})
		).unwrap();

		if (typeof m === 'undefined') return terminal.log('Cancelled');

		const member = members[m];

		return member;
	});
};

export default new Folder('Universe', 'Control the universe', '🌌', [
	new Action('Make Universe', 'Make a new universe', '🌌', async () => {
		(await structActions.new(Universes.Universe)).unwrap();

		return terminal.log('Universe created');
	}),
	new Action('Add Member', 'Add a member to a universe', '👤', async () => {
		const u = await selectUniverse();
		if (u.isErr()) return terminal.error(u.error);
		const unvierse = u.value;
		if (!unvierse) return;
		const m = await Universes.getMembers(unvierse);
		if (m.isErr()) return terminal.error(m.error);
		const members = m.value;

		const account = (await selectAccount((a) => !members.find((m) => m.id === a.id))).unwrap();

		if (!account) return;

		const r = await Universes.addToUniverse(account, unvierse);
		if (r.isErr()) return terminal.error(r.error);
		const role = r.value;

		(
			await Logs.log({
				struct: Universes.Universe.name,
				dataId: role.id,
				accountId: 'CLI',
				type: 'create',
				message: `Added ${account.data.username} to ${unvierse.data.name}`
			})
		).unwrap();

		return terminal.log('Member added');
	}),
	new Action('Remove Member', 'Remove a member from a universe', '🚫', async () => {
		const unvierse = (await selectUniverse()).unwrap();
		if (!unvierse) return;
		const member = (await selectMember(unvierse)).unwrap();

		if (!member) return;

		(await Universes.removeFromUniverse(member, unvierse)).unwrap();

		(
			await Logs.log({
				struct: Universes.Universe.name,
				dataId: member.id,
				accountId: 'CLI',
				type: 'delete',
				message: `Removed ${member.data.username} from ${unvierse.data.name}`
			})
		).unwrap();

		return terminal.log('Member removed');
	}),
	new Action('Add Admin', 'Add an admin to a universe', '👤', async () => {
		const unvierse = (await selectUniverse()).unwrap();
		if (!unvierse) return;
		const member = (await selectMember(unvierse)).unwrap();

		if (!member) return;

		(await Universes.addAdmin(member, unvierse)).unwrap();

		(
			await Logs.log({
				struct: Universes.Universe.name,
				dataId: member.id,
				accountId: 'CLI',
				type: 'update',
				message: `Added ${member.data.username} as admin to ${unvierse.data.name}`
			})
		).unwrap();

		return terminal.log('Admin added');
	}),
	new Action('Remove Admin', 'Remove an admin from a universe', '🚫', async () => {
		const unvierse = (await selectUniverse()).unwrap();
		if (!unvierse) return;
		const member = (await selectMember(unvierse)).unwrap();

		if (!member) return;

		(await Universes.removeAdmin(member, unvierse)).unwrap();

		(
			await Logs.log({
				struct: Universes.Universe.name,
				dataId: member.id,
				accountId: 'CLI',
				type: 'update',
				message: `Removed ${member.data.username} as admin from ${unvierse.data.name}`
			})
		).unwrap();

		return terminal.log('Admin removed');
	})
]);
