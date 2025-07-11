import { Analytics } from '$lib/server/structs/analytics.js';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import ignore from 'ignore';
import fs from 'fs/promises';
import path from 'path';

const ignoreList = await fs
	.readFile(path.resolve(process.cwd(), 'private', 'route-tree.txt'), 'utf-8')
	.catch(() => '');

const ig = ignore();
ig.add(ignoreList);

export const POST = async (event) => {
	const body = await event.request.json();
	const parsed = z
		.object({
			page: z.string().min(1).max(200),
			duration: z
				.number()
				.int()
				.min(0)
				.max(60 * 60 * 24)
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

	if (!ig.ignores(parsed.data.page.slice(1))) {
		return json({
			// Page is not in manifest, so we don't log it. However, we still return a success message for security.
			message: 'Analytics logged successfully'
		});
	}

	const res = await Analytics.Links.new({
		session: event.locals.session.id,
		url: parsed.data.page,
		duration: parsed.data.duration,
		account: event.locals.account?.id || ''
	});

	if (res.isErr()) {
		return json(
			{
				error: 'Failed to log analytics',
				details: res.error.message
			},
			{ status: 500 }
		);
	}

	return json({
		message: 'Analytics logged successfully'
	});
};
