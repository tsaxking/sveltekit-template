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
		const unvierse = (await selectUniverse()).unwrap();
		if (!unvierse) return;
		const members = (await Universes.getMembers(unvierse)).unwrap();

		const account = (await selectAccount((a) => !members.find((m) => m.id === a.id))).unwrap();

		if (!account) return;

		const role = (await Universes.addToUniverse(account, unvierse)).unwrap();

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

		return terminal.log('Member removed');
	})
]);
