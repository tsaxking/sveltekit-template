import { Struct } from 'drizzle-struct/back-end';
import { boolean, text } from 'drizzle-orm/pg-core';
import { type Email as E } from '../../types/email';
import { attemptAsync } from 'ts-utils/check';
import { render } from 'html-constructor';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { sgTransport } from '@neoxia-js/nodemailer-sendgrid-transport';
import terminal from '../utils/terminal';

export namespace Email {
	// const { SENDGRID_API_KEY, SENDGRID_EMAIL, PUBLIC_DOMAIN, HTTPS } = process.env;

	export const Links = new Struct({
		name: 'email_links',
		structure: {
			link: text('link').notNull(),
			opened: boolean('opened').notNull(),
			expires: text('expires').notNull()
		},
		validators: {
			expires: (val) =>
				typeof val === 'string' && (val === 'never' || new Date(val).toString() !== 'Invalid Date')
		}
	});

	export const createLink = (link: string, expires?: Date) => {
		return attemptAsync(async () => {
			throw new Error('Email functionality is deprectaed');
			// const l = (
			// 	await Links.new({
			// 		link,
			// 		opened: false,
			// 		expires: expires ? expires.toISOString() : 'never'
			// 	})
			// ).unwrap();

			// const protocol = ['true', 'y', '1', 'https'].includes((HTTPS || 'f').toLowerCase())
			// 	? 'https://'
			// 	: 'http://';

			// const domain = PUBLIC_DOMAIN?.includes('localhost')
			// 	? 'localhost' + ':' + process.env.PORT
			// 	: PUBLIC_DOMAIN;

			// return protocol + domain + '/email/' + l.id;
		});
	};

	// if (!SENDGRID_API_KEY || !SENDGRID_EMAIL) {
	// 	terminal.warn(
	// 		'SENDGRID_API_KEY or SENDGRID_EMAIL not found in environment variables. There will be no email functionality'
	// 	);
	// }

	// const transporter = nodemailer.createTransport(
	// 	sgTransport({
	// 		auth: {
	// 			apiKey: String(SENDGRID_API_KEY)
	// 		}
	// 	})
	// );

	export const send = <T extends keyof E>(config: {
		type: T;
		data: E[T];
		to: string | string[];
		subject: string;
		attachments?: {
			filename: string;
			path: string;
		}[];
	}) => {
		return attemptAsync(async () => {
			throw new Error('Email functionality is deprectaed');
			// if (!SENDGRID_API_KEY || !SENDGRID_EMAIL) {
			// 	throw new Error('SENDGRID_API_KEY or SENDGRID_EMAIL not found in environment variables');
			// }
			// terminal.log(
			// 	'Senging email:',
			// 	config.type,
			// 	config.subject,
			// 	config.to,
			// 	`attachments:${config.attachments?.length || 0}`
			// );
			// const file = await fs.promises.readFile(
			// 	path.join(process.cwd(), 'private', 'emails', config.type + '.html'),
			// 	'utf-8'
			// );

			// const html = render(file, config.data);

			// await transporter.sendMail({
			// 	from: SENDGRID_EMAIL,
			// 	to: config.to,
			// 	subject: config.subject,
			// 	html,
			// 	attachments: config.attachments
			// });
		});
	};
}

export const _links = Email.Links.table;
