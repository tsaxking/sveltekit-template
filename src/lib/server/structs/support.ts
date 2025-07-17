import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';

export namespace Support {
	export const Tickets = new Struct({
		name: 'support_tickets',
		structure: {
			accountId: text('account_id').notNull(),
			subject: text('subject').notNull(),
			message: text('message').notNull(),
			status: text('status').notNull().default('open')
		}
	});

	export const Reports = new Struct({
		name: 'reports',
		structure: {
			targetAccount: text('target_account').notNull(),
			reporterAccount: text('reporter_account').notNull(),
			reason: text('reason').notNull(),
			message: text('message').notNull(),
			status: text('status').notNull().default('open'),
			resolvedBy: text('resolved_by').notNull().default(''),
			resolvedAt: text('resolved_at').notNull().default('')
		}
	});
}

export const _tickets = Support.Tickets.table;
export const _reports = Support.Reports.table;
