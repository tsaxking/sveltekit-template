/**
 * @fileoverview Server-side fingerprint signing helper.
 *
 * @example
 * import { signFingerprint } from '$lib/server/utils/fingerprint';
 * const sig = await signFingerprint({ fingerprint: 'abc', userAgent: 'ua', language: 'en' }).unwrap();
 */
import crypto from 'crypto';
import { attemptAsync } from 'ts-utils/check';
import { str } from '../utils/env';

/**
 * Signs fingerprint data using HMAC SHA-256.
 *
 * @param {{ fingerprint: string; userAgent: string; language: string }} fpConfig - Fingerprint payload.
 */
export const signFingerprint = (fpConfig: {
	fingerprint: string;
	userAgent: string;
	language: string;
}) => {
	return attemptAsync(async () => {
		const data = `${fpConfig.fingerprint}${fpConfig.userAgent}${fpConfig.language}`;
		const hmac = crypto.createHmac('sha256', str('FINGERPRINT_SECRET', true));
		hmac.update(data);
		return hmac.digest('hex');
	});
};
