import crypto from 'crypto';
import { attemptAsync } from 'ts-utils/check';
import { config } from './env';

export const signFingerprint = (fpConfig: {
	fingerprint: string;
	userAgent: string;
	language: string;
}) => {
	return attemptAsync(async () => {
		const data = `${fpConfig.fingerprint}${fpConfig.userAgent}${fpConfig.language}`;
		const hmac = crypto.createHmac('sha256', config.sessions.fingerprint_secret);
		hmac.update(data);
		return hmac.digest('hex');
	});
};
