import { Account } from '$lib/server/structs/account.js';
import { fail, json } from '@sveltejs/kit';
import z from 'zod';

export const POST = async (event) => {
	if (!event.locals.account) {
		throw fail(401, { message: 'Not authenticated' });
	}

	const parsed = z
		.object({
			sessionId: z.string().optional()
		})
		.safeParse(await event.request.json());

	if (!parsed.success) {
		throw fail(400, {
			message: 'Invalid request body',
			details: parsed.error.message
		});
	}

	if (parsed.data.sessionId) {
		if (
			event.locals.session.id === parsed.data.sessionId ||
			(await Account.isAdmin(event.locals.account))
		) {
			await event.locals.session
				.update({
					accountId: ''
				})
				.unwrap();
		}
	} else {
		await event.locals.session
			.update({
				accountId: ''
			})
			.unwrap();
	}

	return json({ message: 'Signed out successfully' });
};
