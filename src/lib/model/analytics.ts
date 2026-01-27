import { Struct } from '$lib/services/struct/index';
import { browser } from '$app/environment';
import { sse } from '$lib/services/sse';
import { attemptAsync } from 'ts-utils';
import * as remote from '$lib/remotes/analytics.remote';

export namespace Analytics {
	export const Links = new Struct({
		name: 'analytics_links',
		structure: {
			session: 'string',
			url: 'string',
			duration: 'number',
			account: 'string'
		},
		browser,
		socket: sse
	});

	export type LinkData = typeof Links.sample;

	export const myLinks = (config: { page: number; limit: number }) => {
		return attemptAsync(async () => {
			return remote.myLinks(config);
		});
	};

	export const count = () => {
		return attemptAsync(async () => {
			return remote.count();
		});
	};
}
