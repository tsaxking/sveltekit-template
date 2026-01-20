// place files you want to import through the `$lib` alias in this folder.
import '@total-typescript/ts-reset';
import { fingerprint } from './utils/fingerprint';

import { init } from './services/analytics';
import { Requests } from './utils/requests';
import { browser } from '$app/environment';

init();
fingerprint();

export const ogFetch = (() => {
	if (!browser) return fetch;
	const og = window.fetch;
	window.fetch = (url: URL | RequestInfo, config?: RequestInit) => {
		const headers = {
			...(config?.headers ?? {}),
			...Object.fromEntries(Object.entries(Requests.metadata).map(([k, v]) => [`X-${k}`, v]))
		};
		return og(url, {
			...config,
			headers
		});
	};
	return og;
})();
