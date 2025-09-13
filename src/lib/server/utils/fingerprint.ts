import crypto from 'crypto';
import { attemptAsync } from 'ts-utils/check';
import { str } from './env';

export const signFingerprint = (config: {
	fingerprint: string;
	userAgent: string;
	language: string;
}) => {
	return attemptAsync(async () => {
		const data = `${config.fingerprint}${config.userAgent}${config.language}`;
		const hmac = crypto.createHmac('sha256', str('FINGERPRINT_SECRET', true));
		hmac.update(data);
		return hmac.digest('hex');
	});
};
