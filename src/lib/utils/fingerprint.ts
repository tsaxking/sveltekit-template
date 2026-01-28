/**
 * @fileoverview Browser fingerprint collection and reporting.
 *
 * @example
 * import { fingerprint } from '$lib/utils/fingerprint';
 * await fingerprint();
 */
import { getCurrentBrowserFingerPrint } from '@rajesh896/broprint.js';
import { attemptAsync } from 'ts-utils/check';
import { browser } from '$app/environment';
import { fingerprint as fp } from '$lib/remotes/analytics.remote';

/**
 * Computes a browser fingerprint and reports it to the server.
 */
export const fingerprint = () => {
	return attemptAsync(async () => {
		if (!browser) {
			throw new Error('Fingerprinting is only available in the browser environment.');
		}
		const fingerprint = await getCurrentBrowserFingerPrint();
		if (!fingerprint) {
			throw new Error('Failed to retrieve fingerprint');
		}

		await fp({ fingerprint });
		return fingerprint;
	});
};
