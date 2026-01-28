/**
 * @fileoverview Page metadata utilities.
 *
 * @example
 * import { getTitle } from '$lib/utils/pages';
 * const title = await getTitle('https://example.com').unwrap();
 */
import { browser } from '$app/environment';
import { attemptAsync } from 'ts-utils/check';

/**
 * Fetches a URL and returns its HTML document title.
 *
 * @param {string} url - Page URL.
 */
export const getTitle = (url: string) => {
	return attemptAsync(async () => {
		if (!browser) {
			throw new Error('getTitle can only be called in the browser');
		}
		const res = await fetch(url, {
			method: 'GET',
			headers: {
				cache: 'no-cache'
			}
		});

		if (!res.ok) {
			throw new Error('Server responded with status: ' + res.status);
		}

		const text = await res.text();

		const parse = new DOMParser();
		const doc = parse.parseFromString(text, 'text/html');
		const tilte = doc.querySelector('title');
		if (!tilte) {
			return url;
		}
		return tilte.textContent || 'No title found';
	});
};
