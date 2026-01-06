import { getCurrentBrowserFingerPrint } from '@rajesh896/broprint.js';
import { attemptAsync } from 'ts-utils/check';
import { browser } from '$app/environment';

export const fingerprint = () => {
	return attemptAsync(async () => {
		if (!browser) {
			throw new Error('Fingerprinting is only available in the browser environment.');
		}
		const fingerprint = await getCurrentBrowserFingerPrint();
		if (!fingerprint) {
			throw new Error('Failed to retrieve fingerprint');
		}

		const res = await fetch('/api/fp', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ fingerprint: fingerprint.toString() })
		});

		if (!res.ok) {
			throw new Error('Failed to send fingerprint to server');
		}
		return fingerprint;
	});
};
