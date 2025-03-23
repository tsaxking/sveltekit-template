import { Email } from '../src/lib/server/structs/email';

export default async (email: string) => {
	if (!email) throw new Error('Email must be provided');
	if (!email.includes('@')) throw new Error('Email must be valid');

	(
		await Email.send({
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
