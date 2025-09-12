import { sendEmail } from '../src/lib/server/services/email';
import redis from '../src/lib/server/services/redis';

export default async (email: string) => {
	if (!email) throw new Error('Email must be provided');
	if (!email.includes('@')) throw new Error('Email must be valid');
	await redis.init(1000);

	(
		await sendEmail({
			type: 'test',
			data: {
				link: 'http://localhost:5173',
				linkText: 'Test Link',
				service: 'Test Service'
			},
			to: email,
			subject: 'Test Email'
		})
	).unwrap();
};
