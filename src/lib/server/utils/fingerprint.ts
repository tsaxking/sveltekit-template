import crypto from 'crypto';
import { attemptAsync } from 'ts-utils/check';

export const signFingerprint = (config: {
	fingerprint: string;
	userAgent: string;
	language: string;
}) => {
	return attemptAsync(async () => {
		const data = `${config.fingerprint}${config.userAgent}${config.language}`;
		const hmac = crypto.createHmac('sha256', process.env.FINGERPRINT_SECRET || 'default_secret');
		hmac.update(data);
		return hmac.digest('hex');
	});
};
