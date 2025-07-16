import { redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = async (event) => {
	const account = event.locals.account;

	if (!account) {
		throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
	}

	return {
		account: account.safe()
	};
};
