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

		const res = await Analytics.getAccountLinks(account, {
			limit: data.limit,
			offset: data.page * data.limit
		});
		if (res.isOk()) {
			return res.value.map((n) => n.safe());
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

/**
 * Returns a distinct link count for the current account or session.
 */
export const count = query(async () => {
	const account = await getAccount();
	if (account) {
		const count = await Analytics.getCount(account);
		if (count.isOk()) {
			return count.value;
		} else {
			return error(500, 'Internal Server Error');
		}
	} else {
		const session = await getSession();
		const links = await Analytics.Links.get(
			{
				session: session.id
			},
			{
				type: 'all'
			}
		);
		if (links.isOk()) {
			return links.value.filter((v, i, a) => a.findIndex((v2) => v2.data.url === v.data.url) === i)
				.length;
		} else {
			return error(500, 'Internal Server Error');
		}
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
		const res = await session.update({
			fingerprint: data.fingerprint.toString()
		});
		if (!res.isOk()) {
			return error(500, 'Internal Server Error');
		}
		const event = getRequestEvent();
		const signed = await signFingerprint({
			fingerprint: data.fingerprint.toString(),
			userAgent: event.request.headers.get('user-agent') || '',
			language: event.request.headers.get('accept-language') || ''
		});
		if (signed.isOk()) {
			event.cookies.set('fpid', signed.value, {
				httpOnly: true,
				domain:
					domain({
						port: false,
						protocol: false
					}) ?? '',
				path: '/'
			});
		} else {
			return error(500, 'Internal Server Error');
		}
	}
);

const manifesto = ignore();
manifesto.add(getManifesto());

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
			// using ignores to check patterns, but not actually ignore anything
			if (!manifesto.ignores(data.page.slice(1))) {
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
