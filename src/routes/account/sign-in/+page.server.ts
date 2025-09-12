import { fail, redirect } from '@sveltejs/kit';
import { Account } from '$lib/server/structs/account.js';
import { Session } from '$lib/server/structs/session.js';
import { ServerCode } from 'ts-utils/status';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import terminal from '$lib/server/utils/terminal';
import { domain, str } from '$lib/server/utils/env';

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
			terminal.error(res.error);
			return fail(ServerCode.badRequest, {
				message: 'Invalid form data',
				user: data.get('user')
			});
		}

		let account: Account.AccountData | undefined;

		ACCOUNT: {
			const user = await Account.Account.fromProperty('username', res.data.username, {
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

			const email = await Account.Account.fromProperty('email', res.data.username, {
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

			return fail(ServerCode.badRequest, {
				user: res.data.username,
				message: 'Invalid username or email'
			});
		}

		const pass = Account.hash(res.data.password, account.data.salt);
		if (pass.isErr()) {
			terminal.error(pass.error);
			return fail(ServerCode.internalServerError, {
				user: res.data.username,
				message: 'Failed to hash password'
			});
		}

		const sessionRes = await Session.signIn(account, event.locals.session);
		if (sessionRes.isErr()) {
			terminal.error(sessionRes.error);
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
		// const domain = String(process.env.PUBLIC_DOMAIN).includes('localhost')
		// 	? `${process.env.PUBLIC_DOMAIN}:${process.env.PORT}`
		// 	: process.env.PUBLIC_DOMAIN;
		// const protocol = process.env.HTTPS === 'true' ? 'https://' : 'http://';
		const url = domain({
			port: false,
			protocol: true
		});
		const redirectUri = `${url}/oauth/sign-in`;
		const client = new OAuth2Client({
			clientSecret: str('OAUTH2_CLIENT_SECRET', true),
			clientId: str('OAUTH2_CLIENT_ID', true),
			redirectUri
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
