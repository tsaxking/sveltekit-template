import { fail, redirect } from '@sveltejs/kit';
import { Account } from '$lib/server/structs/account';
import { Analytics } from '$lib/server/structs/analytics';
import { ServerCode } from 'ts-utils/status';

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
	}).pipe((l) => {
		if (pages[l.data.url]) {
			pages[l.data.url].views++;
			pages[l.data.url].retention += l.data.duration;
			pages[l.data.url].uniqueVisitors.add(l.data.account);
		} else {
			pages[l.data.url] = {
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
