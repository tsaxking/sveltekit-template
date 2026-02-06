/**
 * @fileoverview CLI helpers and menu actions for account management.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Account } from '../src/lib/server/structs/account';
import { selectData, structActions, viewData } from './struct';
import { Action, confirm, Folder, password, prompt } from './utils';
import terminal from '../src/lib/server/utils/terminal';
import { Logs } from '../src/lib/server/structs/log';
import { attemptAsync } from 'ts-utils/check';

/**
 * Prompt the user to select an account from all accounts, optionally filtered.
 *
 * @param filter - Optional filter to apply to the account list.
 * @returns Result wrapper containing the selected account or a cancellation message.
 *
 * @example
 * const account = (await selectAccount((a) => a.data.verified)).unwrap();
 */
export const selectAccount = (filter?: (account: Account.AccountData) => boolean) => {
	return attemptAsync(async () => {
		const accounts = (
			await Account.Account.all({
				type: 'stream'
			}).await()
		)
			.unwrap()
			.filter(filter ?? (() => true));

		const a = (
			await selectData(accounts as any, 'Select an account', {
				omit: ['id', 'verification', 'key', 'salt', 'attributes', 'universe']
			})
		).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const account = accounts[a];

		return account;
	});
};

/**
 * Accounts CLI folder with common account maintenance actions.
 *
 * Actions include listing, creating, verifying, role promotion, and log viewing.
 */
export default new Folder('Accounts', 'Edit accounts', '👤', [
	new Action('List', 'List all accounts', '📋', async () => {
		return (
			await structActions.all(Account.Account as any, undefined, {
				omit: ['id', 'verification', 'key', 'salt', 'attributes', 'universe']
			})
		).unwrap();
	}),
	new Action('Create', 'Create a new account', '➕', async () => {
		const username = (
			await prompt({
				message: 'Enter a username'
			})
		).unwrap();
		if (!username) return;
		const p = (
			await password({
				message: 'Enter a password'
			})
		).unwrap();
		if (!p) return;

		const { hash, salt } = Account.newHash(p).unwrap();

		return (
			await structActions.new(Account.Account as any, undefined, {
				username,
				key: hash,
				salt
			})
		).unwrap();
	}),
	new Action('Verify', 'Verify an account', '🔐', async () => {
		const account = await selectAccount((account) => !account.data.verified).unwrap();
		if (!account) return terminal.log('Invalid account');
		const confirmed = await confirm({
			message: `Verify ${account.data.username}?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(
			await account.update({
				verification: '',
				verified: true
			})
		).unwrap();

		(
			await Logs.log({
				struct: Account.Account.data.name,
				dataId: account.id,
				type: 'update',
				accountId: 'CLI',
				message: `Account ${account.data.username} verified through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now verified`);
	}),
	new Action('Unverify', 'Unverify an account', '🔓', async () => {
		const account = (await selectAccount((account) => account.data.verified)).unwrap();
		if (!account) return terminal.log('Invalid account');
		const confirmed = await confirm({
			message: `Unverify ${account.data.username}?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(
			await account.update({
				verified: false
			})
		).unwrap();

		(
			await Logs.log({
				struct: Account.Account.data.name,
				dataId: account.id,
				type: 'update',
				accountId: 'CLI',
				message: `Account ${account.data.username} unverified through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now unverified`);
	}),
	new Action('Make Admin', 'Make an account an admin', '👑', async () => {
		const account = (await selectAccount()).unwrap();
		if (!account) return terminal.log('Invalid account');

		const isAdmin = await (await Account.isAdmin(account)).unwrap();
		if (isAdmin) return terminal.log('Account is already an admin');
		const confirmed = await confirm({
			message: `Make ${account.data.username} an admin?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		const admin = (
			await Account.Admins.new({
				accountId: account.id
			})
		).unwrap();

		(
			await Logs.log({
				struct: Account.Admins.data.name,
				dataId: admin.id,
				type: 'create',
				accountId: 'CLI',
				message: `Account ${account.data.username} made admin through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now an admin`);
	}),
	new Action('Remove Admin', 'Remove an account as an admin', '🚫', async () => {
		const admins = (await Account.getAdmins()).unwrap();

		const a = (
			await selectData(admins as any, 'Select an account to remove as an admin', {
				omit: ['id', 'verification', 'key', 'salt', 'attributes', 'universe']
			})
		).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const admin = admins[a];

		const adminData = (
			await Account.Admins.get(
				{ accountId: admin.id },
				{
					type: 'single'
				}
			)
		).unwrap();

		if (!adminData) return terminal.log('Invalid admin');

		const confirmed = await confirm({
			message: `Remove ${admin.data.username} as an admin?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(await adminData.delete()).unwrap();

		(
			await Logs.log({
				struct: Account.Admins.data.name,
				dataId: adminData.id,
				type: 'delete',
				accountId: 'CLI',
				message: `Account ${admin.data.username} removed as admin through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${admin.data.username} is no longer an admin`);
	}),
	new Action('Make Developer', 'Make an account a developer', '👨‍💻', async () => {
		const account = await selectAccount().unwrap();

		if (!account) return terminal.log('Invalid account');

		const isDeveloper = await Account.isDeveloper(account).unwrap();
		if (isDeveloper) return terminal.log('Account is already a developer');

		const confirmed = await confirm({
			message: `Make ${account.data.username} a developer?`
		});

		if (!confirmed) return terminal.log('Cancelled');
		const dev = (
			await Account.Developers.new({
				accountId: account.id
			})
		).unwrap();

		(
			await Logs.log({
				struct: Account.Developers.data.name,
				dataId: dev.id,
				type: 'create',
				accountId: 'CLI',
				message: `Account ${account.data.username} made developer through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now a developer`);
	}),
	new Action('Remove developer', 'Remove an account as a developer', '🚫', async () => {
		const developers = (await Account.getDevelopers()).unwrap();

		const a = (
			await selectData(developers as any, 'Select an account to remove as a developer', {
				omit: ['id', 'verification', 'key', 'salt']
			})
		).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const developer = developers[a];

		const developerData = (
			await Account.Developers.get(
				{ accountId: developer.id },
				{
					type: 'single'
				}
			)
		).unwrap();

		if (!developerData) return terminal.log('Invalid developer');

		const confirmed = await confirm({
			message: `Remove ${developer.data.username} as a developer?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(await developerData.delete()).unwrap();

		(
			await Logs.log({
				struct: Account.Developers.data.name,
				dataId: developerData.id,
				type: 'delete',
				accountId: 'CLI',
				message: `Account ${developer.data.username} removed as developer through CLI`
			})
		).unwrap();

		return terminal.log(`Account ${developer.data.username} is no longer a developer`);
	}),
	new Action('View Account Logs', 'View the logs of an account', '📜', async () => {
		const account = (await selectAccount()).unwrap();
		if (!account) return terminal.log('Invalid account');

		const logs = (
			await Logs.Log.get(
				{ accountId: account.id },
				{
					type: 'stream'
				}
			).await()
		).unwrap();

		terminal.log('LOGS:', logs.length);

		const res = await viewData(logs, 'Logs', {
			omit: ['id', 'accountId', 'archived', 'attributes']
		});

		if (res.isErr()) terminal.error(res.error);
	})
]);
