import { redirect } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';

export const actions = {
	'sign-out': (event) => {
		event.locals.session.update({
			accountId: ''
		});

		throw redirect(ServerCode.seeOther, '/account/sign-in');
	}
};
