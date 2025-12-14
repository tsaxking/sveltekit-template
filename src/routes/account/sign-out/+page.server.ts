import { redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const load = (event) => {
	if (!event.locals.account) throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
};

export const actions = {
	'sign-out': (event) => {
		event.locals.session.update({
			accountId: ''
		});

		throw redirect(ServerCode.seeOther, '/account/sign-in');
	}
};
