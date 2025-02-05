import { Session } from '$lib/server/structs/session.js';
import { config } from 'dotenv';
import { Struct } from 'drizzle-struct/back-end';
import { Account } from '$lib/server/structs/account';
import '$lib/server/structs/permissions';
import '$lib/server/structs/universe';
import { DB } from '$lib/server/db/';
import { handleEvent, connectionEmitter } from '$lib/server/event-handler';
import '$lib/server/utils/files';
import { env } from '$env/dynamic/private';
import path from 'path';
import { Email } from '$lib/server/structs/email';
import { PUBLIC_APP_NAME } from '$env/static/public';
import terminal from '$lib/server/utils/terminal.js';
config();

Struct.each((struct) => {
	if (!struct.built) {
		struct.build(DB);
		struct.eventHandler(handleEvent(struct));
		connectionEmitter(struct);
	}
});

Struct.setupLogger(path.join(process.cwd(), 'logs', 'structs'));

process.on('exit', async (code) => {
	if (code > 0) {
		if ([
			'true',
			't',
			'y',
			'1',
			'yes'
		].includes(String(env.SEND_STATUS_EMAILS).toLowerCase())) {
			terminal.error('Server shutdown unexpectedly with code: ', code);
			(await Email.sendStatus('System shutdown', {
				admins: true,
				developers: false,
			}, {
				status: 'Error',
				description: 'Server shutdown unexpectedly',
				impact: 'High',
				resolutionEta: 'Unknown',
				system: PUBLIC_APP_NAME,
				link: '/server-status', // server is off so this will not work
			})).unwrap();
		}
	}
});

export const load = async (event) => {
	const session = await Session.getSession(event);
	if (session.isErr()) {
		return {
			status: 500,
			error: 'Failed to get session'
		};
	}

	if (env.AUTO_SIGN_IN) {
		const account = await Account.Account.fromId(env.AUTO_SIGN_IN);
		if (account.isOk() && account.value) {
			const res = await Session.signIn(account.value, session.value);
			if (res.isErr()) {
				return {
					status: 500,
					error: 'Failed to sign in'
				};
			}
		}
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
};
