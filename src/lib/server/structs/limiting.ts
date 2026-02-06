/**
 * @fileoverview IP and session limiting, blocking, and rate-limit utilities.
 *
 * This module manages page rulesets, blocked entities, and rate-limit
 * enforcement using Redis counters.
 *
 * @example
 * import { Limiting } from '$lib/server/structs/limiting';
 * const limited = Limiting.isIpLimitedPage('/admin').unwrap();
 */
import { text } from 'drizzle-orm/pg-core';
import { Struct } from 'drizzle-struct';
import type { Session } from './session';
import type { Account } from './account';
import { attempt, attemptAsync } from 'ts-utils/check';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import redis from '../services/redis';
import { config, str } from '../utils/env';
import { pathMatch } from '../utils/file-match';

export namespace Limiting {
	try {
		fs.mkdirSync(path.join(process.cwd(), 'private'), { recursive: true });
	} catch {
		// Do nothing
	}

	export const limits = {
		ip: pathMatch(''),
		blocked: pathMatch('')
	};

	try {
		const ipLimit = fs.readFileSync(
			path.join(process.cwd(), 'private', 'ip-limited.pages'),
			'utf-8'
		);
		limits.ip = pathMatch(ipLimit);
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
		limits.blocked = pathMatch(blockedPageList);
	} catch {
		fs.writeFileSync(
			path.join(process.cwd(), 'private', 'blocked.pages'),
			'# Put pages here that you would like to be blocked for all ips\n'
		);
	}

	/**
	 * Per-page IP allow list entry.
	 *
	 * @property {string} ip - IP address allowed for a page.
	 * @property {string} page - Page path pattern.
	 */
	export const PageRuleset = new Struct({
		name: 'page_ruleset',
		structure: {
			/** IP address allowed for a page. */
			ip: text('ip').notNull(),
			/** Page path pattern. */
			page: text('page').notNull()
		}
	});

	// Prevent duplicates
	PageRuleset.on('create', async (rs) => {
		const rules = PageRuleset.get(
			{ ip: rs.data.ip },
			{
				type: 'stream'
			}
		);

		rules.pipe((r) => {
			if (r.data.page === rs.data.page && r.id !== rs.id) {
				rs.delete();
			}
		});
	});

	/**
	 * Checks whether a page is subject to IP limiting.
	 *
	 * @param {string} page - Page path.
	 */
	export const isIpLimitedPage = (page: string) => {
		return attempt(() => {
			return limits.ip.test(page);
		});
	};

	/**
	 * Checks whether a page is blocked for all users.
	 *
	 * @param {string} page - Page path.
	 */
	export const isBlockedPage = (page: string) => {
		return attempt(() => {
			return limits.blocked.test(page);
		});
	};

	/**
	 * Determines whether an IP is allowed to access a limited page.
	 *
	 * @param {string} ip - Client IP address.
	 * @param {string} page - Requested page path.
	 */
	export const isIpAllowed = (ip: string, page: string) => {
		return attemptAsync(async () => {
			const manifest = limits.ip.getPattern(page);
			const rules = await PageRuleset.get(
				{ ip },
				{
					type: 'all'
				}
			).unwrap();
			return !!rules.find((r) => manifest.includes(r.data.page));
		});
	};

	/**
	 * Blocked IP record.
	 *
	 * @property {string} ip - Blocked IP address.
	 * @property {string} reason - Reason for blocking.
	 */
	export const BlockedIps = new Struct({
		name: 'blocked_ips',
		structure: {
			/** Blocked IP address. */
			ip: text('ip').notNull(),
			/** Reason for blocking. */
			reason: text('reason').notNull()
		}
	});

	/**
	 * Blocked session record.
	 *
	 * @property {string} session - Blocked session ID.
	 * @property {string} reason - Reason for blocking.
	 */
	export const BlockedSessions = new Struct({
		name: 'blocked_sessions',
		structure: {
			/** Blocked session ID. */
			session: text('session').notNull(),
			/** Reason for blocking. */
			reason: text('reason').notNull()
		}
	});

	/**
	 * Blocked fingerprint record.
	 *
	 * @property {string} fingerprint - Fingerprint hash.
	 * @property {string} reason - Reason for blocking.
	 */
	export const BlockedFingerprints = new Struct({
		name: 'blocked_fingerprints',
		structure: {
			/** Fingerprint hash. */
			fingerprint: text('fingerprint').notNull(),
			/** Reason for blocking. */
			reason: text('reason').notNull()
		}
	});

	/**
	 * Blocked account record.
	 *
	 * @property {string} account - Blocked account ID.
	 * @property {string} reason - Reason for blocking.
	 */
	export const BlockedAccounts = new Struct({
		name: 'blocked_accounts',
		structure: {
			/** Blocked account ID. */
			account: text('account').notNull(),
			/** Reason for blocking. */
			reason: text('reason').notNull()
		}
	});

	/**
	 * Thresholds for escalating violations.
	 *
	 * @property {number} warn - Violation score to warn.
	 * @property {number} block - Violation score to block.
	 */
	export const ViolationTiers = {
		warn: 10,
		block: 50
	};

	/**
	 * Checks whether a session, IP, fingerprint, or account is blocked.
	 *
	 * @param {Session.SessionData} session - Active session.
	 * @param {Account.AccountData} [account] - Optional account.
	 */
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
			const ipBlocked = await BlockedIps.get(
				{ ip: session.data.ip },
				{
					type: 'single'
				}
			).unwrap();
			if (ipBlocked) return { blocked: true, reason: ipBlocked.data.reason };
			const sessionBlocked = await BlockedSessions.get(
				{ session: session.id },
				{
					type: 'single'
				}
			).unwrap();
			if (sessionBlocked) return { blocked: true, reason: sessionBlocked.data.reason };
			const fingerprintBlocked = await BlockedFingerprints.get(
				{ fingerprint: session.data.fingerprint },
				{ type: 'single' }
			).unwrap();
			if (fingerprintBlocked) return { blocked: true, reason: fingerprintBlocked.data.reason };
			if (account) {
				const accountBlocked = await BlockedAccounts.get(
					{ account: account.id },
					{
						type: 'single'
					}
				).unwrap();
				if (accountBlocked) return { blocked: true, reason: accountBlocked.data.reason };
			}
			return { blocked: false };
		});
	};

	/**
	 * Builds a fingerprint hash from request headers.
	 *
	 * @param {Request} request - Incoming request.
	 */
	export const getFingerprint = (request: Request) => {
		const ip = request.headers.get('x-forwarded-for') ?? '';
		const ua = request.headers.get('user-agent') ?? '';
		const accept = request.headers.get('accept') ?? '';
		const language = request.headers.get('accept-language') ?? '';

		const salt = str('FINGERPRINT_SECRET', true);

		const raw = `${ip}|${ua}|${accept}|${language}|${salt}`;

		return createHash('sha256').update(raw).digest('hex');
	};

	/**
	 * Redis counter group for rate limits and violations.
	 */
	const limitService = redis.createItemGroup('rate_limit', 'number');

	/**
	 * Increments and checks the rate limit counter for a key.
	 *
	 * @param {string} key - Rate limit key (e.g., IP or session).
	 */
	export const rateLimit = async (key: string) => {
		return attemptAsync(async () => {
			if (!config.limiting.enabled) return false;
			const limit = config.limiting.requests;
			const windowSec = config.limiting.window;
			const count = await limitService.incr(key).unwrap();

			if (count === 1) {
				await limitService.expire(key, windowSec).unwrap();
			}

			return count > limit;
		});
	};

	/**
	 * Increments violation counters and returns the new severity.
	 *
	 * @param {Session.SessionData} session - Active session.
	 * @param {Account.AccountData | undefined} account - Optional account.
	 * @param {number} increment - Violation increment amount.
	 * @param {string} reason - Reason for the violation.
	 */
	export const violate = async (
		session: Session.SessionData,
		account: Account.AccountData | undefined,
		increment: number,
		reason: string
	) => {
		return attemptAsync(async () => {
			await Promise.all([
				limitService.incr(`violation_ip:${session.data.ip}`, increment).unwrap(),
				limitService.incr(`violation_session:${session.id}`, increment).unwrap(),
				limitService.incr(`violation_fingerprint:${session.data.fingerprint}`, increment).unwrap(),
				account
					? limitService.incr(`violation_account:${account.id}`, increment).unwrap()
					: Promise.resolve()
			]);
			await Promise.all([
				limitService.expire(`violation_ip:${session.data.ip}`, 60 * 60 * 24),
				limitService.expire(`violation_session:${session.id}`, 60 * 60 * 24),
				limitService.expire(`violation_fingerprint:${session.data.fingerprint}`, 60 * 60 * 24),
				account
					? limitService.expire(`violation_account:${account.id}`, 60 * 60 * 24)
					: Promise.resolve()
			]);

			const score = Math.max(
				...(await Promise.all([
					limitService.getItem(`violation_ip:${session.data.ip}`),
					limitService.getItem(`violation_session:${session.id}`),
					limitService.getItem(`violation_fingerprint:${session.data.fingerprint}`),
					account ? limitService.getItem(`violation_account:${account.id}`) : Promise.resolve('0')
				]).then((res) => res.map(Number)))
			);

			switch (true) {
				case score < 10:
					return 'warn';
				case score < 50:
					return 'block';
			}

			// If the score is 50 or more, block the IP, session, fingerprint, and account.
			const sessionExists = await BlockedSessions.get(
				{ session: session.id },
				{
					type: 'single'
				}
			).unwrap();
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

			const ipExists = await BlockedIps.get(
				{ ip: session.data.ip },
				{
					type: 'single'
				}
			).unwrap();
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

			const fingerprintExists = await BlockedFingerprints.get(
				{ fingerprint: session.data.fingerprint },
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

	/**
	 * Returns the highest violation score for the given identifiers.
	 *
	 * @param {Session.SessionData} session - Active session.
	 * @param {Account.AccountData} [account] - Optional account.
	 */
	export const violationSeverity = (
		session: Session.SessionData,
		account?: Account.AccountData
	) => {
		return attemptAsync(async () => {
			const ipScore = await limitService
				.getItem(`violation_ip:${session.data.ip}`)
				.then((res) => Number(res) || 0);
			const sessionScore = await limitService
				.getItem(`violation_session:${session.id}`)
				.then((res) => Number(res) || 0);
			const fingerprintScore = await limitService
				.getItem(`violation_fingerprint:${session.data.fingerprint}`)
				.then((res) => Number(res) || 0);
			const accountScore = account
				? await limitService
						.getItem(`violation_account:${account.id}`)
						.then((res) => Number(res) || 0)
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
