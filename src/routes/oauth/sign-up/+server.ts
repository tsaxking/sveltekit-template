import { Account } from '$lib/server/structs/account.js';
import { fail, redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { ServerCode } from 'ts-utils/status';
import { domain, str } from '$lib/server/utils/env.js';

export const GET = async (event) => {
	const code = event.url.searchParams.get('code');
	if (!code) throw redirect(ServerCode.temporaryRedirect, '/account/sign-up');
	// const domain = String(process.env.PUBLIC_DOMAIN).includes('localhost')
	// 	? `${process.env.PUBLIC_DOMAIN}:${process.env.PORT}`
	// 	: process.env.PUBLIC_DOMAIN;
	// const protocol = process.env.HTTPS === 'true' ? 'https://' : 'http://';
	// const redirectUri = `${protocol}${domain}/oauth/sign-in`;
	const url = domain({
		port: false,
		protocol: true
	});
	const redirectUri = `${url}/oauth/sign-up`;
	try {
		const client = new OAuth2Client({
			clientId: str('OAUTH2_CLIENT_ID', true),
			clientSecret: str('OAUTH2_CLIENT_SECRET', true),
			redirectUri
		});
		// log(client);

		const r = await client.getToken(code);
		client.setCredentials(r.tokens);

		const info = await google
			.oauth2({
				auth: client,
				version: 'v2'
			})
			.userinfo.get();

		// log(r);
		const account = await Account.Account.fromProperty(
			'email',
			info.data.email || 'nothing should never happen',
			{
				type: 'single'
			}
		);
		// log(account);
		if (account.isErr()) return new Response('Error checking if account exists', { status: 500 });
		if (account.value) {
			// TODO: OAuth redirect to an error page?
			throw fail(ServerCode.unauthorized, {
				message: 'Account already exists'
			});
		}

		const a = await Account.createAccountFromOauth(info.data);
		// log(a);
		if (a.isErr()) return new Response('Error creating account', { status: 500 });
		// if (a.value) {
		//     setTimeout(() => {
		//         Account.sendAccountNotif(a.value, {
		//             title: 'Account created',
		//             severity: 'success',
		//             message: 'Account created successfully',
		//             link: '',
		//             'icon': '',
		//         });
		//     }, 1000);
		// }
	} catch {
		// log(err);
	}

	throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
};
