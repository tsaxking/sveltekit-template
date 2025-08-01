import { Account } from '$lib/server/structs/account';
import { fail } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	const account = await Account.Account.fromProperty('username', event.params.username, {
		type: 'single'
	}).unwrap();

	if (!account) {
		throw fail(ServerCode.notFound, {
			message: 'Account not found'
		});
	}

	// business logic for filtering the params the user can view
	const accountInfo = await Account.getAccountInfo(account).unwrap();

	const accountData = account.safe();
	const accountInfoData = accountInfo.safe();

	return {
		account: accountData,
		info: accountInfoData
	};
};
