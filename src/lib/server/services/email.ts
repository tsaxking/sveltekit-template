import { attemptAsync } from 'ts-utils/check';
import { type Email } from '../../types/email';
import { Redis } from 'redis-utils';

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
export const sendEmail = <T extends keyof Email>(
	config: {
		type: T;
		data: Email[T];
		to: string | string[];
		subject: string;
		attachments?: {
			filename: string;
			path: string; // fullpath
		}[];
	},
	targetService?: string
) => {
	return attemptAsync(async () => {
		if (!targetService) {
			if (!process.env.EMAIL_MICROSERVICE_NAME) {
				throw new Error(
					'EMAIL_MICROSERVICE_NAME environment variable is not set. Please set it to the name of your email service.'
				);
			}
			targetService = process.env.EMAIL_MICROSERVICE_NAME;
		}

		const pub = Redis.getPub().unwrap();

		// Compose the job payload
		const job = {
			type: config.type,
			data: config.data,
			to: config.to,
			subject: config.subject,
			attachments: config.attachments ?? [],
			// Optionally add a timestamp or jobId here
			timestamp: Date.now()
		};

		// Push the job as a JSON string to a Redis list keyed by the targetService
		// e.g. "emailServiceQueue"

		// Use LPUSH to add a job to the head of the queue
		await pub.lPush(targetService, JSON.stringify(job));

		return {
			success: true,
			message: `Email job queued successfully on ${targetService}`
		};
	});
};
