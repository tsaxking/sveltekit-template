import { fail, redirect } from '@sveltejs/kit';
import { Account } from '$lib/server/structs/account.js';
import { Session } from '$lib/server/structs/session.js';
import { ServerCode } from 'ts-utils/status';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
// import { SECRET_OAUTH2_CLIENT_ID, SECRET_OAUTH2_CLIENT_SECRET } from '$env/static/private';
import terminal from '$lib/server/utils/terminal';

// const log = (...args: unknown[]) => console.log('[oauth/sign-in]', ...args);

export const actions = {
	login: async (event) => {
		const data = await event.request.formData();
		const res = z
			.object({
				username: z.string(),
				password: z.string()
			})
			.safeParse({
				username: data.get('user'),
				password: data.get('password')
			});
		if (!res.success) {
			return fail(ServerCode.badRequest, {
				message: 'Invalid form data',
				user: data.get('user')
			});
		}

		let account: Account.AccountData | undefined;

		ACCOUNT: {
			const user = await Account.Account.fromProperty('username', res.data.username.toLowerCase(), {
				type: 'single'
			});
			if (user.isErr()) {
				return fail(ServerCode.internalServerError, {
					user: res.data.username,
					message: 'Failed to get user'
				});
			}
			account = user.value;
			if (account) break ACCOUNT;

			const email = await Account.Account.fromProperty('email', res.data.username.toLowerCase(), {
				type: 'single'
			});
			if (email.isErr()) {
				return fail(ServerCode.internalServerError, {
					user: res.data.username,
					message: 'Failed to get user'
				});
			}
			account = email.value;
			if (account) break ACCOUNT;

			return fail(ServerCode.notFound, {
				user: res.data.username,
				message: 'User not found'
			});
		}

		const sessionRes = await Session.signIn(account, event.locals.session);
		if (sessionRes.isErr()) {
			console.error(sessionRes.error);
			return fail(ServerCode.internalServerError, {
				user: res.data.username,
				message: 'Failed to sign in'
			});
		}

		return {
			message: 'Logged in',
			user: res.data.username,
			redirect: event.locals.session.data.prevUrl || '/',
			success: true
		};
	},
	OAuth2: async () => {
		const client = new OAuth2Client({
			clientSecret: String(process.env.SECRET_OAUTH2_CLIENT_SECRET),
			clientId: String(process.env.SECRET_OAUTH2_CLIENT_ID),
			redirectUri: 'http://localhost:5173/oauth/sign-in'
		});
		// log(client);
		const authorizeUrl = client.generateAuthUrl({
			access_type: 'offline',
			// scope: 'https://www.googleapis.com/auth/userinfo.profile openid email',
			scope: [
				'https://www.googleapis.com/auth/userinfo.profile',
				'https://www.googleapis.com/auth/userinfo.email',
				'openid'
			],
			prompt: 'consent'
		});
		// log(authorizeUrl);

		throw redirect(ServerCode.temporaryRedirect, authorizeUrl);
	},
	'request-password-reset': async (event) => {
		const formdata = await event.request.formData();
		const user = z.string().safeParse(formdata.get('user'));
		terminal.log(user);
		const exit = () => ({
			redirect: '/account/password-reset'
		});
		if (!user.success) {
			terminal.error(user.error);
			return exit();
		}

		let account = await Account.Account.fromProperty('username', user.data, { type: 'single' });
		if (account.isErr()) {
			terminal.error(account.error);
			return exit();
		}

		if (!account.value) {
			account = await Account.Account.fromProperty('email', user.data, { type: 'single' });
			if (account.isErr()) {
				terminal.error(account.error);
				return exit();
			}
		}

		if (!account.value) {
			return exit();
		}

		const reset = await Account.requestPasswordReset(account.value);

		if (reset.isErr()) {
			terminal.error(reset.error);
		}

		return exit();
	}
};
