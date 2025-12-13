import crypto from 'crypto';
import { attemptAsync } from 'ts-utils/check';
import { str } from '../utils/env';

/**
 *
 * @param fpConfig
 * @returns
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
