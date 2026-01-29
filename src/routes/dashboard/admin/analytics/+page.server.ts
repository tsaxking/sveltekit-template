/**
 * @fileoverview Server load for admin analytics page `/dashboard/admin/analytics`.
 */
import { fail, redirect } from '@sveltejs/kit';
import { Account } from '$lib/server/structs/account';
import { Analytics } from '$lib/server/structs/analytics';
import { ServerCode } from 'ts-utils/status';
import { getManifestoInstance } from '$lib/server/utils/manifesto.js';

export const load = async (event) => {
	if (!event.locals.account) {
		throw redirect(303, '/account/sign-in');
	}
	if (!(await Account.isAdmin(event.locals.account)))
		throw fail(ServerCode.forbidden, {
			message: 'Only administrators can access this page'
		});

	const pages: Record<
		string,
		{
			views: number;
			retention: number;
			uniqueVisitors: Set<string>;
		}
	> = {};

	await Analytics.Links.all({
		type: 'stream'
	}).pipe(async (l) => {
		const pattern = getManifestoInstance(l.data.url) || '/';
		if (pages[pattern]) {
			pages[pattern].views++;
			pages[pattern].retention += l.data.duration;
			pages[pattern].uniqueVisitors.add(l.data.account);
		} else {
			pages[pattern] = {
				views: 1,
				retention: l.data.duration,
				uniqueVisitors: new Set([l.data.account])
			};
		}
	});

	return {
		pages: Object.fromEntries(
			Object.entries(pages).map(([url, data]) => [
				url,
				{
					views: data.views,
					retention: data.retention / data.views,
					uniqueVisitors: data.uniqueVisitors.size
				}
			])
		)
	};
};
