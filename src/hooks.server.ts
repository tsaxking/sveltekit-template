import { Account } from '$lib/server/structs/account';
import { Session } from '$lib/server/structs/session';
import '$lib/server/structs/permissions';
import '$lib/server/structs/universe';
import '$lib/server/structs/log';
import { type Handle } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { env } from '$env/dynamic/private';
import terminal from '$lib/server/utils/terminal';
import { config } from 'dotenv';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '$lib/server/db/';
import { handleEvent, connectionEmitter } from '$lib/server/event-handler';
import '$lib/server/utils/files';
import path from 'path';
import '$lib/server/index';
config();

Struct.each((struct) => {
	if (!struct.built) {
		struct.build(DB);
		struct.eventHandler(handleEvent(struct));
		connectionEmitter(struct);
	}
});

Struct.setupLogger(path.join(process.cwd(), 'logs', 'structs'));

export const handle: Handle = async ({ event, resolve }) => {
	const session = await Session.getSession(event);
	if (session.isErr()) {
		return new Response('Internal Server Error', { status: ServerCode.internalServerError });
	}

	event.locals.session = session.value;

	if (env.AUTO_SIGN_IN) {
		const a = await Account.Account.fromProperty('username', env.AUTO_SIGN_IN, { type: 'single' });
		if (a.isOk() && a.value) {
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
		!event.url.href.startsWith('/account/password-reset') &&
		!event.url.href.startsWith('/status') &&
		!event.url.href.startsWith('/sse') &&
		!event.url.href.startsWith('/struct') &&
		!event.url.href.startsWith('/test')
	) {
		session.value.update({
			prevUrl: event.url.pathname
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
