import { Account } from '$lib/server/structs/account';
import { Session } from '$lib/server/structs/session';
import { type Handle } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { env } from '$env/dynamic/private';
import terminal from '$lib/server/utils/terminal';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await Session.getSession(event);
	if (session.isErr()) {
		return new Response('Internal Server Error', { status: ServerCode.internalServerError });
	}

	event.locals.session = session.value;

	if (env.AUTO_SIGN_IN) {
		const a = await Account.Account.fromId(env.AUTO_SIGN_IN);
		if (a.isOk() && a.value && !session.value.data.accountId) {
			const res = await Session.signIn(a.value, session.value);
			if (res.isErr()) {
				return new Response('Internal Server Error', { status: ServerCode.internalServerError });
			}
			event.locals.account = a.value;
		}
	} else {
		const account = await Session.getAccount(session.unwrap());
		if (account.isErr()) {
			return new Response('Internal Server Error', { status: ServerCode.internalServerError });
		}

		event.locals.account = account.value;
	}

	if (
		!['/account/sign-in', '/account/sign-up'].includes(event.url.pathname) &&
		!event.url.pathname.includes('/account/password-reset') &&
		!event.url.pathname.includes('/status')
	) {
		session.value.update({
			prevUrl: event.url.pathname,
			requests: session.value.data.requests + 1
		});
	} else {
		session.value.update({
			requests: session.value.data.requests + 1
		});
	}

	try {
		return resolve(event);
	} catch (error) {
		terminal.error(error);
		// redirect to error page
		return new Response('Redirect', {
			status: ServerCode.seeOther,
			headers: {
				location: `/status/${ServerCode.internalServerError}`
			}
		});
	}
};
