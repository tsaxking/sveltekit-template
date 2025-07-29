import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct/back-end';
import type { Session } from './session';
import type { Account } from './account';
import { attempt, attemptAsync } from 'ts-utils/check';
import { createHash } from 'crypto';
import { Redis } from '../services/redis';
import { z } from 'zod';
import ignore from 'ignore';
import fs from 'fs';
import path from 'path';
import terminal from '../utils/terminal';

export namespace Limiting {
	const ipLimited = ignore();
	const blockedPages = ignore();

	try {
		fs.mkdirSync(path.join(process.cwd(), 'private'), { recursive: true });
	} catch (error) {
		// Do nothing
	}

	try {
		const ipLimit = fs.readFileSync(
			path.join(process.cwd(), 'private', 'ip-limited.pages'),
			'utf-8'
		);

		ipLimited.add(ipLimit);
	} catch {
		fs.writeFileSync(
			path.join(process.cwd(), 'private', 'ip-limited.pages'),
			'# Put pages here that you would like to be limited to specifi ips\n'
		);
	}

	try {
		const blockedPageList = fs.readFileSync(
			path.join(process.cwd(), 'private', 'blocked.pages'),
			'utf-8'
		);

		blockedPages.add(blockedPageList);
	} catch {
		fs.writeFileSync(
			path.join(process.cwd(), 'private', 'blocked.pages'),
			'# Put pages here that you would like to be blocked for all ips\n'
		);
	}

	export const PageRuleset = new Struct({
		name: 'page_ruleset',
		structure: {
			ip: text('ip').notNull(),
			page: text('page').notNull()
		}
	});

	// Prevent duplicates
	PageRuleset.on('create', async (rs) => {
		const rules = PageRuleset.fromProperty('ip', rs.data.ip, {
			type: 'stream'
		});

		rules.pipe((r) => {
			if (r.data.page === rs.data.page) {
				rs.delete();
			}
		});
	});

	export const isIpLimitedPage = (page: string) => {
		return attempt(() => {
			if (page.startsWith('/')) page = page.slice(1);
			if (page.length === 0) return false;
			return ipLimited.ignores(page);
		});
	};

	export const isBlockedPage = (page: string) => {
		return attempt(() => {
			if (page.startsWith('/')) page = page.slice(1);
			if (page.length === 0) return false;
			return blockedPages.ignores(page);
		});
	};

	export const isIpAllowed = (ip: string, page: string) => {
		return attemptAsync(async () => {
			const rules = PageRuleset.fromProperty('ip', ip, {
				type: 'stream'
			});

			let allowed = false;
			await rules.pipe((r) => {
				if (r.data.page === page) allowed = true;
			});
			return allowed;
		});
	};

	export const BlockedIps = new Struct({
		name: 'blocked_ips',
		structure: {
			ip: text('ip').notNull(),
			reason: text('reason').notNull()
		}
	});

	export const BlockedSessions = new Struct({
		name: 'blocked_sessions',
		structure: {
			session: text('session').notNull(),
			reason: text('reason').notNull()
		}
	});

	export const BlockedFingerprints = new Struct({
		name: 'blocked_fingerprints',
		structure: {
			fingerprint: text('fingerprint').notNull(),
			reason: text('reason').notNull()
		}
	});

	export const BlockedAccounts = new Struct({
		name: 'blocked_accounts',
		structure: {
			account: text('account').notNull(),
			reason: text('reason').notNull()
		}
	});

	export const ViolationTiers = {
		warn: 10,
		block: 50
	};

	export const isBlocked = (session: Session.SessionData, account?: Account.AccountData) => {
		return attemptAsync<
			| {
					blocked: true;
					reason: string;
			  }
			| {
					blocked: false;
			  }
		>(async () => {
			const ipBlocked = await BlockedIps.fromProperty('ip', session.data.ip, {
				type: 'single'
			}).unwrap();
			if (ipBlocked) return { blocked: true, reason: ipBlocked.data.reason };
			const sessionBlocked = await BlockedSessions.fromProperty('session', session.id, {
				type: 'single'
			}).unwrap();
			if (sessionBlocked) return { blocked: true, reason: sessionBlocked.data.reason };
			const fingerprintBlocked = await BlockedFingerprints.fromProperty(
				'fingerprint',
				session.data.fingerprint,
				{ type: 'single' }
			).unwrap();
			if (fingerprintBlocked) return { blocked: true, reason: fingerprintBlocked.data.reason };
			if (account) {
				const accountBlocked = await BlockedAccounts.fromProperty('account', account.id, {
					type: 'single'
				}).unwrap();
				if (accountBlocked) return { blocked: true, reason: accountBlocked.data.reason };
			}
			return { blocked: false };
		});
	};

	export const getFingerprint = (request: Request) => {
		const ip = request.headers.get('x-forwarded-for') ?? '';
		const ua = request.headers.get('user-agent') ?? '';
		const accept = request.headers.get('accept') ?? '';
		const language = request.headers.get('accept-language') ?? '';

		const raw = `${ip}|${ua}|${accept}|${language}|${process.env.FINGERPRINT_SALT ?? ''}`;

		return createHash('sha256').update(raw).digest('hex');
	};

	export const rateLimit = async (key: string) => {
		const limit = parseInt(process.env.REQUEST_LIMIT ?? '1000', 10);
		const windowSec = parseInt(process.env.REQUEST_LIMIT_WINDOW ?? '60000', 10) / 1000; // Convert milliseconds to seconds
		const redisRes = Redis.getPub();
		if (redisRes.isErr()) {
			console.error('Failed to get Redis client for rate limiting:', redisRes.error);
			return false;
		}
		const count = await redisRes.value.incr(key);

		if (count === 1) {
			await redisRes.value.expire(key, windowSec);
		}

		return count > limit;
	};

	export const violate = async (
		session: Session.SessionData,
		account: Account.AccountData | undefined,
		increment: number,
		reason: string
	) => {
		return attemptAsync(async () => {
			await Promise.all([
				Redis.incr(`violation_ip:${session.data.ip}`, increment),
				Redis.incr(`violation_session:${session.id}`, increment),
				Redis.incr(`violation_fingerprint:${session.data.fingerprint}`, increment),
				account ? Redis.incr(`violation_account:${account.id}`, increment) : Promise.resolve()
			]);
			await Promise.all([
				Redis.expire(`violation_ip:${session.data.ip}`, 60 * 60 * 24),
				Redis.expire(`violation_session:${session.id}`, 60 * 60 * 24),
				Redis.expire(`violation_fingerprint:${session.data.fingerprint}`, 60 * 60 * 24),
				account ? Redis.expire(`violation_account:${account.id}`, 60 * 60 * 24) : Promise.resolve()
			]);

			const score = Math.max(
				...(await Promise.all([
					Redis.getValue(`violation_ip:${session.data.ip}`, z.number()),
					Redis.getValue(`violation_session:${session.id}`, z.number()),
					Redis.getValue(`violation_fingerprint:${session.data.fingerprint}`, z.number()),
					account
						? Redis.getValue(`violation_account:${account.id}`, z.number())
						: Promise.resolve('0')
				]).then((res) => res.map(Number)))
			);

			switch (true) {
				case score < 10:
					return 'warn';
				case score < 50:
					return 'block';
			}

			// If the score is 50 or more, block the IP, session, fingerprint, and account.
			const sessionExists = await BlockedSessions.fromProperty('session', session.id, {
				type: 'single'
			}).unwrap();
			if (!sessionExists) {
				await BlockedSessions.new({
					session: session.id,
					reason
				}).unwrap();
			} else {
				await sessionExists
					.update({
						reason
					})
					.unwrap();
			}

			const ipExists = await BlockedIps.fromProperty('ip', session.data.ip, {
				type: 'single'
			}).unwrap();
			if (!ipExists) {
				await BlockedIps.new({
					ip: session.data.ip,
					reason
				}).unwrap();
			} else {
				await ipExists
					.update({
						reason
					})
					.unwrap();
			}

			const fingerprintExists = await BlockedFingerprints.fromProperty(
				'fingerprint',
				session.data.fingerprint,
				{ type: 'single' }
			).unwrap();
			if (!fingerprintExists) {
				await BlockedFingerprints.new({
					fingerprint: session.data.fingerprint,
					reason
				}).unwrap();
			} else {
				await fingerprintExists
					.update({
						reason
					})
					.unwrap();
			}

			return 'perma-block';
		});
	};

	export const violationSeverity = (
		session: Session.SessionData,
		account?: Account.AccountData
	) => {
		return attemptAsync(async () => {
			const ipScore = await Redis.getValue(`violation_ip:${session.data.ip}`, z.number()).then(
				(res) => Number(res) || 0
			);
			const sessionScore = await Redis.getValue(`violation_session:${session.id}`, z.number()).then(
				(res) => Number(res) || 0
			);
			const fingerprintScore = await Redis.getValue(
				`violation_fingerprint:${session.data.fingerprint}`,
				z.number()
			).then((res) => Number(res) || 0);
			const accountScore = account
				? await Redis.getValue(`violation_account:${account.id}`, z.number()).then(
						(res) => Number(res) || 0
					)
				: 0;

			return Math.max(ipScore, sessionScore, fingerprintScore, accountScore);
		});
	};
}

export const _pageRuleset = Limiting.PageRuleset.table;
export const _blockedIps = Limiting.BlockedIps.table;
export const _blockedSessions = Limiting.BlockedSessions.table;
export const _blockedFingerprints = Limiting.BlockedFingerprints.table;
export const _blockedAccounts = Limiting.BlockedAccounts.table;
