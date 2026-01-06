import { Account } from '$lib/server/structs/account.js';
import { Session } from '$lib/server/structs/session.js';
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { ServerCode } from 'ts-utils/status';
import { domain, str } from '$lib/server/utils/env.js';

// const log = (...args: unknown[]) => console.log('[oauth/sign-in]', ...args);

export const GET = async (event) => {
	const code = event.url.searchParams.get('code');
	if (!code) throw redirect(ServerCode.temporaryRedirect, '/account/sign-up');
	// const domain = String(process.env.PUBLIC_DOMAIN).includes('localhost')
	// 	? `${process.env.PUBLIC_DOMAIN}:${process.env.PORT}`
	// 	: process.env.PUBLIC_DOMAIN;
	// const protocol = process.env.HTTPS === 'true' ? 'https://' : 'http://';
	// const redirectUri = `${protocol}${domain}/api/oauth/sign-in`;
	// try {
	const url = domain({
		port: false,
		protocol: true
	});
	const redirectUri = `${url}/api/oauth/sign-in`;
	const client = new OAuth2Client({
		clientId: str('OAUTH2_CLIENT_ID', true),
		clientSecret: str('OAUTH2_CLIENT_SECRET', true),
		redirectUri
	});
	// log('CLIENT:', client);

	const r = await client.getToken(code);
	client.setCredentials(r.tokens);
	// log('TOKENS:', r.tokens);
	const info = await google
		.oauth2({
			auth: client,
			version: 'v2'
		})
		.userinfo.get();
	// token exists, check if account exists
	const account = await Account.Account.fromProperty(
		'email',
		info.data.email || 'nothing should never happen',
		{
			type: 'single'
		}
	);
	// log('ACCOUNT:', account);
	if (account.isErr()) return new Response('Error checking if account exists', { status: 500 });

	if (account.value) {
		await Session.signIn(account.value, event.locals.session);

		throw redirect(ServerCode.permanentRedirect, event.locals.session.data.prevUrl || '/');
	}
	// } catch (err) {
	//     // throw new Error(error);
	//     console.log('Error logging in with google', err);
	// }
	throw redirect(ServerCode.temporaryRedirect, '/account/sign-in');
};
