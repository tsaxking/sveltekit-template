import { Account } from '$lib/server/structs/account';
import { Session } from '$lib/server/structs/session';
import { Analytics } from '$lib/server/structs/analytics';
import '$lib/server/structs/permissions';
import '$lib/server/structs/log';
import { type Handle } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import { env } from '$env/dynamic/private';
import terminal from '$lib/server/utils/terminal';
import { config } from 'dotenv';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '$lib/server/db/';
import '$lib/server/utils/files';
import '$lib/server/index';
import { createStructEventService } from '$lib/server/services/struct-event';
import { Redis } from '$lib/server/services/redis';
import ignore from 'ignore';

config();

(async () => {
	await Redis.connect().unwrap();
	Struct.each((struct) => {
		if (!struct.built) {
			struct.build(DB);
			createStructEventService(struct);
		}
	});
})();

// if (env.LOG === 'true') {
// 	Struct.setupLogger(path.join(process.cwd(), 'logs', 'structs'));
// }

const ig = ignore();
ig.add(`
/account
/status
/sse
/struct
/test
/favicon.ico
/robots.txt
/oauth
/email
`);

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
	}

	if (!event.locals.account) {
		const account = await Session.getAccount(session.value);
		if (account.isErr()) {
			return new Response('Internal Server Error', { status: ServerCode.internalServerError });
		}

		event.locals.account = account.value;
	}

	const notIgnored = () => {
		if (event.url.pathname === '/') return true;
		return (
			!ig.ignores(event.url.pathname.slice(1)) &&
			!event.url.pathname.startsWith('/.')
		);
	}

	if (notIgnored()) {
		session.value.update({
			prevUrl: event.url.pathname
		});
	}

	try {
		const res = await resolve(event);
		if (notIgnored()) {
			Analytics.Links.new({
				session: session.value.id,
				url: event.url.pathname,
			});
		}
		return res;
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
