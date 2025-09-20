import { attemptAsync } from 'ts-utils/check';
import { type Email } from '../../types/email';
import redis from './redis';
import { z } from 'zod';
import { render } from 'html-constructor';
import fs from 'fs/promises';
import path from 'path';
import { num, str } from '../utils/env';

const emailService = redis.createQueue(
	str('EMAIL_QUEUE_NAME', true),
	z.object({
		html: z.string().optional(),
		text: z.string().optional(),
		to: z.union([z.string(), z.array(z.string())]),
		subject: z.string(),
		attachments: z
			.array(
				z.object({
					filename: z.string(),
					path: z.string() // full path
				})
			)
			.optional()
	}),
	num('MAX_EMAIL_QUEUE', false) || 100
);

const openEmail = (name: keyof Email) => {
	return attemptAsync(async () => {
		const filepath = path.join(process.cwd(), 'private', 'emails', name + '.html');

		return fs.readFile(filepath, 'utf-8');
	});
};

/**
 *
 * @param config - Configuration object containing the type of email, data, recipient(s), subject, and optional attachments.
 * @param config.type - The type of email to send, which corresponds to a key in the Email type.
 * @param config.data - The data to be included in the email, structured according to the type specified.
 * @param config.to - The recipient(s) of the email, which can be a single email address or an array of email addresses.
 * @param config.subject - The subject line of the email.
 * @param config.attachments - Optional array of attachments to include in the email, each with a filename and path.
 *
 * @param targetService - The name of the target service queue to which the email job will be pushed. Defaults to the value of EMAIL_MICROSERVICE_NAME environment variable or 'emailServiceQueue'.
 * @returns
 */
export const sendEmail = <T extends keyof Email>(config: {
	type: T;
	data: Email[T];
	to: string | string[];
	subject: string;
	attachments?: {
		filename: string;
		path: string; // fullpath
	}[];
}) => {
	return attemptAsync(async () => {
		const html = await openEmail(config.type).unwrap();

		const job = {
			html: render(html, config.data),
			to: config.to,
			subject: config.subject,
			attachments: config.attachments ?? [],
			timestamp: Date.now()
		};

		await emailService.add(job).unwrap();

		return {
			success: true,
			message: `Email job queued successfully`
		};
	});
};
