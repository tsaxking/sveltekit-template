/**
 * @fileoverview Server load/actions for `/account/manage-profile`.
 */
import { Account } from '$lib/server/structs/account.js';
import { redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	const account = event.locals.account;

	if (!account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}

	const info = await Account.getAccountInfo(account).unwrap();

	return {
		account: account.safe(),
		info: info.safe()
	};
};
