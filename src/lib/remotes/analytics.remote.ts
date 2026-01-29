/**
 * @fileoverview Analytics RPC layer for shared client/server access.
 *
 * Each `query()`/`command()` curries a handler with a Zod schema that validates
 * inputs at the boundary, enabling type-safe and permission-safe usage on both
 * client and server.
 *
 * @example
 * import * as analyticsRemote from '$lib/remotes/analytics.remote';
 * const links = await analyticsRemote.myLinks({ limit: 10, page: 0 });
 */
import { command, getRequestEvent, query } from '$app/server';
import z from 'zod';
import { getAccount, getSession } from './index.remote';
import { Analytics } from '$lib/server/structs/analytics';
import { error } from '@sveltejs/kit';
import { signFingerprint } from '$lib/server/utils/fingerprint';
import { domain } from '$lib/server/utils/env';
import ignore from 'ignore';
import { getManifesto } from '$lib/server/utils/manifesto';

/**
 * Returns analytics links for the current account.
 *
 * @param {{ limit?: number; page?: number }} data - Paging payload.
 */
export const myLinks = query(
	z.object({
		limit: z.number().min(1).max(100).default(10),
		page: z.number().min(0).default(0)
	}),
	async (data) => {
		const account = await getAccount();
		if (!account) {
			return error(401, 'Unauthorized');
		}

		return (
			await Analytics.getAccountLinks(account, {
				limit: data.limit,
				offset: data.page * data.limit
			}).unwrap()
		).map((link) => link.safe());
	}
);

/**
 * Returns a distinct link count for the current account or session.
 */
export const count = query(async () => {
	const account = await getAccount();
	if (account) {
		return Analytics.getCount(account).unwrap();
	} else {
		const session = await getSession();
		const links = await Analytics.Links.get(
			{
				session: session.id
			},
			{
				type: 'all'
			}
		).unwrap();
		return links.filter((v, i, a) => a.findIndex((v2) => v2.data.url === v.data.url) === i).length;
	}
});

/**
 * Stores a fingerprint for the current session and sets the signed cookie.
 *
 * @param {{ fingerprint: number }} data - Fingerprint payload.
 */
export const fingerprint = command(
	z.object({
		fingerprint: z.number()
	}),
	async (data) => {
		const session = await getSession();
		await session
			.update({
				fingerprint: data.fingerprint.toString()
			})
			.unwrap();
		const event = getRequestEvent();
		event.cookies.set(
			'fpid',
			await signFingerprint({
				fingerprint: data.fingerprint.toString(),
				userAgent: event.request.headers.get('user-agent') || '',
				language: event.request.headers.get('accept-language') || ''
			}).unwrap(),
			{
				httpOnly: true,
				domain:
					domain({
						port: false,
						protocol: false
					}) ?? '',
				path: '/'
			}
		);
	}
);

const ig = ignore();
ig.add(getManifesto());

/**
 * Records a page close event with duration if not ignored by the manifesto.
 *
 * @param {{ page: string; duration: number }} data - Page close payload.
 */
export const close = command(
	z.object({
		page: z.string().min(1).max(200),
		duration: z
			.number()
			.int()
			.min(0)
			.max(60 * 60 * 24)
	}),
	async (data) => {
		try {
			if (!ig.ignores(data.page.slice(1))) {
				return;
			}
		} catch {
			return;
		}
		const session = await getSession();
		const account = await getAccount();
		await Analytics.Links.new({
			session: session.id,
			url: data.page,
			duration: data.duration,
			account: account?.id || ''
		});
	}
);
