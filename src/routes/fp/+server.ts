import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { signFingerprint } from '$lib/server/utils/fingerprint';
import { sleep } from 'ts-utils/sleep';
import { domain } from '$lib/server/utils/env.js';

export const POST = async (event) => {
	const body = await event.request.json();
	const parsed = z
		.object({
			fingerprint: z.string()
		})
		.safeParse(body);

	if (!parsed.success) {
		return json(
			{
				error: 'Invalid request body',
				details: parsed.error.message
			},
			{ status: 400 }
		);
	}

	await sleep(1000); // Simulate processing delay

	await event.locals.session
		.update({
			fingerprint: parsed.data.fingerprint
		})
		.unwrap();

	event.cookies.set(
		'fpid',
		await signFingerprint({
			fingerprint: parsed.data.fingerprint,
			userAgent: event.request.headers.get('user-agent') || '',
			language: event.request.headers.get('accept-language') || ''
		}).unwrap(),
		{
			httpOnly: true,
			domain:
				domain({
					port: false,
					protocol: false
				}) ?? '',
			path: '/'
		}
	);

	return json({
		message: 'Fingerprint received successfully'
	});
};
