import { Account } from '$lib/server/structs/account';
import { Session } from '$lib/server/structs/session';
import '$lib/server/structs/analytics';
import { Limiting } from '$lib/server/structs/limiting';
import '$lib/server/structs/permissions';
import '$lib/server/structs/log';
import '$lib/server/structs/testing';
import { type Handle } from '@sveltejs/kit';
import { ServerCode } from 'ts-utils/status';
import terminal from '$lib/server/utils/terminal';
import { Struct } from 'drizzle-struct/back-end';
import { DB } from '$lib/server/db/';
import '$lib/server/utils/files';
import '$lib/server/index';
import { createStructEventService } from '$lib/server/services/struct-event';
import ignore from 'ignore';
import { sse } from '$lib/server/services/sse';
import { sleep } from 'ts-utils/sleep';
import { signFingerprint } from '$lib/server/utils/fingerprint';
import redis from '$lib/server/services/redis';
import { env, str } from '$lib/server/utils/env';

(async () => {
	await redis.init();
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

const sessionIgnore = ignore();
sessionIgnore.add(`
/account
/status
/sse
/struct
/test
/favicon.ico
/robots.txt
/oauth
/email
/analytics
`);

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.start = performance.now();
	if (Limiting.isBlockedPage(event.url.pathname).unwrap()) {
		// Redirect to /status/404
		return new Response('Redirect', {
			status: ServerCode.seeOther,
			headers: {
				location: `/status/${ServerCode.notFound}`
			}
		});
	}

	if (Limiting.isIpLimitedPage(event.url.pathname).unwrap()) {
		const ip =
			event.request.headers.get('x-forwarded-for') ||
			event.request.headers.get('x-real-ip') ||
			event.request.headers.get('cf-connecting-ip') ||
			event.request.headers.get('remote-addr') ||
			event.request.headers.get('x-client-ip') ||
			event.request.headers.get('x-cluster-client-ip') ||
			event.request.headers.get('x-forwarded-for');
		if (!ip) {
			terminal.warn(`No IP address found for request to ${event.url.pathname}`);
			return new Response('Redirect', {
				status: ServerCode.seeOther,
				headers: {
					location: `/status/${ServerCode.forbidden}`
				}
			});
		}
		if (!(await Limiting.isIpAllowed(ip, event.url.pathname).unwrap())) {
			return new Response('Redirect', {
				status: ServerCode.seeOther,
				headers: {
					location: `/status/${ServerCode.forbidden}`
				}
			});
		}
	}

	const session = await Session.getSession(event);
	if (session.isErr()) {
		return new Response('Internal Server Error', { status: ServerCode.internalServerError });
	}

	event.locals.session = session.value;

	const autoSignIn = str('AUTO_SIGN_IN', false);

	if (autoSignIn && env !== 'prod') {
		const a = await Account.Account.fromProperty('username', autoSignIn, { type: 'single' });
		if (a.isOk() && a.value) {
			event.locals.account = a.value;
			Object.assign(event.locals.session.data, {
				accountId: a.value.id
			});
		}
	}

	if (!event.locals.account) {
		const account = await Session.getAccount(session.value);
		if (account.isErr()) {
			return new Response('Internal Server Error', { status: ServerCode.internalServerError });
		}

		event.locals.account = account.value;
	}

	PROD: if (env === 'prod') {
		const isBlocked = await Limiting.isBlocked(event.locals.session, event.locals.account);
		if (isBlocked.isErr()) {
			return new Response('Internal Server Error', { status: ServerCode.internalServerError });
		}

		if (isBlocked.value.blocked) {
			await sleep(1000); // wait a bit before responding
			terminal.warn(
				`Blocked session ${event.locals.session.id} (${event.locals.session.data.ip}) due to suspicious activity.`
			);
			break PROD;
			// return new Response(
			// 	'Forbidden. This client has been permanently blocked due to suspicious activity.',
			// 	{
			// 		status: ServerCode.forbidden,
			// 		headers: {
			// 			'Content-Type': 'text/plain'
			// 		}
			// 	}
			// );
		}

		FP: if (event.locals.session.data.fingerprint) {
			const fpid = await event.cookies.get('fpid');
			if (!fpid) break FP; // not set yet. skip verification process. This shouldn't happen because if the session has it, it's been signed.
			if (
				fpid !==
				(await signFingerprint({
					fingerprint: event.locals.session.data.fingerprint,
					userAgent: event.request.headers.get('user-agent') || '',
					language: event.request.headers.get('accept-language') || ''
				}).unwrap())
			) {
				// Fingerprint mismatch, rate limit
				terminal.warn(`Fingerprint mismatch for session. Incrementing violation count.`);
				Limiting.violate(event.locals.session, event.locals.account, 1, 'Fingerprint mismatch');
				sse.fromSession(event.locals.session.id).notify({
					title: 'Fingerprint Mismatch',
					severity: 'warning',
					message:
						'Your fingerprint does not match the one we have stored. This may indicate suspicious activity. Please contact support if you believe this is an error.'
				});
			}
		} else {
			// If no fingerprint, assume it's a little suspicious and wait a bit.
			// This should only happen on the inital load of the app, not subsequent requests.
			await sleep(100);
		}
	}

	const notIgnored = () => {
		if (event.url.pathname === '/') return true;
		return (
			!sessionIgnore.ignores(event.url.pathname.slice(1)) && !event.url.pathname.startsWith('/.')
		);
	};

	if (notIgnored()) {
		session.value.update({
			prevUrl: event.url.pathname
		});

		const violation = await Limiting.violationSeverity(event.locals.session, event.locals.account);
		if (violation.isErr()) {
			return new Response('Internal Server Error', { status: ServerCode.internalServerError });
		} else {
			if (violation.value < Limiting.ViolationTiers.warn) {
				await sleep(100 * violation.value);
			}
		}

		const limit = await Promise.all([
			Limiting.rateLimit(`limit_ip:${event.locals.session.data.ip}`),
			Limiting.rateLimit(`limit_session:${event.locals.session.id}`),
			Limiting.rateLimit(`limit_fingerprint:${event.locals.session.data.fingerprint}`),
			event.locals.account
				? Limiting.rateLimit(`limit_account:${event.locals.account.id}`)
				: Promise.resolve(false)
		]);

		if (limit.some((l) => l)) {
			const res = await Limiting.violate(
				event.locals.session,
				event.locals.account,
				1,
				'Rate limit exceeded'
			);
			if (res.isOk()) {
				switch (res.value) {
					case 'warn':
						terminal.warn(
							`Rate limit violation for session ${event.locals.session.id} (${event.locals.session.data.ip})`
						);
						sse.fromSession(event.locals.session.id).notify({
							title: 'Rate Limit Warning',
							severity: 'warning',
							message:
								'You are sending too many requests, you will experience degraded performance temporarily.'
						});
						await sleep(100);
						break;
					case 'block':
						await sleep(1000); // wait a bit before responding
						terminal.warn(
							`Blocked session ${event.locals.session.id} (${event.locals.session.data.ip}) due to rate limiting.`
						);
					// return new Response(
					// 	'You are being rate limited. If this continues, you will be blocked from our service.',
					// 	{
					// 		status: ServerCode.tooManyRequests,
					// 		headers: {
					// 			'Content-Type': 'text/plain'
					// 		}
					// 	}
					// );
				}
			}
		}
	}

	try {
		const res = await resolve(event);
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
