/* eslint-disable @typescript-eslint/no-explicit-any */
import { Account } from '../structs/account';
import { selectData, structActions } from './struct';
import { Action, confirm, Folder, password, prompt } from './utils';
import terminal from '../utils/terminal';

export default new Folder('Accounts', 'Edit accounts', '👤', [
	new Action('List', 'List all accounts', '📋', async () => {
		return (await structActions.all(Account.Account as any, undefined, {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();
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
		const accounts = (
			await Account.Account.fromProperty('verified', false, {
				type: 'stream'
			}).await()
		).unwrap();
		const a = (await selectData(accounts as any, 'Select an account to verify', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();
		if (typeof a === 'undefined') return terminal.log('Cancelled');
		const account = accounts[a];
		if (!account) return terminal.log('Invalid account');
		const confirmed = await confirm({
			message: `Verify ${account.data.username}?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		await account.update({
			verification: '',
			verified: true
		});

		return terminal.log(`Account ${account.data.username} is now verified`);
	}),
	new Action('Unverify', 'Unverify an account', '🔓', async () => {
		const accounts = (
			await Account.Account.fromProperty('verified', true, {
				type: 'stream'
			}).await()
		).unwrap();
		const a = (await selectData(accounts as any, 'Select an account to unverify', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();
		if (typeof a === 'undefined') return terminal.log('Cancelled');
		const account = accounts[a];
		if (!account) return terminal.log('Invalid account');
		const confirmed = await confirm({
			message: `Unverify ${account.data.username}?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		await account.update({
			verified: false
		});

		return terminal.log(`Account ${account.data.username} is now unverified`);
	}),
	new Action('Make Admin', 'Make an account an admin', '👑', async () => {
		const accounts = (
			await Account.Account.all({
				type: 'stream'
			}).await()
		).unwrap();
		const a = (await selectData(accounts as any, 'Select an account to make an admin', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();
		if (typeof a === 'undefined') return terminal.log('Cancelled');
		const account = accounts[a];
		if (!account) return terminal.log('Invalid account');

		const isAdmin = await (await Account.isAdmin(account)).unwrap();
		if (isAdmin) return terminal.log('Account is already an admin');
		const confirmed = await confirm({
			message: `Make ${account.data.username} an admin?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(
			await Account.Admins.new({
				accountId: account.id
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now an admin`);
	}),
	new Action('Remove Admin', 'Remove an account as an admin', '🚫', async () => {
		const admins = (await Account.getAdmins()).unwrap();

		const a = (await selectData(admins as any, 'Select an account to remove as an admin', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const admin = admins[a];

		const adminData = (await Account.Admins.fromProperty('accountId', admin.id, {
			type: 'single',
		})).unwrap();

		if (!adminData) return terminal.log('Invalid admin');

		const confirmed = await confirm({
			message: `Remove ${admin.data.username} as an admin?`
		});

		if (!confirmed) return terminal.log('Cancelled');
		
		(await adminData.delete()).unwrap();

		return terminal.log(`Account ${admin.data.username} is no longer an admin`);
	}),
	new Action('Make Developer', 'Make an account a developer', '👨‍💻', async () => {
		const accounts = (
			await Account.Account.all({
				type: 'stream'
			}).await()
		).unwrap();

		const a = (await selectData(accounts as any, 'Select an account to make a developer', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const account = accounts[a];

		const isDeveloper = await (await Account.isDeveloper(account)).unwrap();
		if (isDeveloper) return terminal.log('Account is already a developer');


		const confirmed = await confirm({
			message: `Make ${account.data.username} a developer?`
		});

		if (!confirmed) return terminal.log('Cancelled');
		(
			await Account.Developers.new({
				accountId: account.id
			})
		).unwrap();

		return terminal.log(`Account ${account.data.username} is now a developer`);
	}),
	new Action('Remove developer', 'Remove an account as a developer', '🚫', async () => {
		const developers = (await Account.getDevelopers()).unwrap();

		const a = (await selectData(developers as any, 'Select an account to remove as a developer', {
			omit: ['id', 'verification', 'key', 'salt'],
		})).unwrap();

		if (typeof a === 'undefined') return terminal.log('Cancelled');

		const developer = developers[a];

		const developerData = (await Account.Developers.fromProperty('accountId', developer.id, {
			type: 'single',
		})).unwrap();

		if (!developerData) return terminal.log('Invalid developer');

		const confirmed = await confirm({
			message: `Remove ${developer.data.username} as a developer?`
		});

		if (!confirmed) return terminal.log('Cancelled');

		(await developerData.delete()).unwrap();

		return terminal.log(`Account ${developer.data.username} is no longer a developer`);
	}),
]);
