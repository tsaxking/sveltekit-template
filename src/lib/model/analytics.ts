import { Struct } from 'drizzle-struct/front-end';
import { browser } from '$app/environment';
import { sse } from '$lib/services/sse';
import { z } from 'zod';

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

	export const myLinks = (config: { offset: number; limit: number }) => {
		return Links.query('my-links', config, {
			asStream: true
		}).await();
	};

	export const count = () => {
		return Links.send('count', {}, z.number());
	};
}
