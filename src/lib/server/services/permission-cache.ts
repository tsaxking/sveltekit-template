/**
 * Multi-level caching system for permission data
 * Three levels: Request → Redis → Database
 * 
 * - Request cache: In-memory cache for the duration of a single HTTP request
 * - Redis cache: Cross-request cache with TTL
 * - Database: Final fallback
 */

import { attemptAsync } from 'ts-utils/check';
import redis from './redis';
import { Permissions } from '../structs/permissions';
import type { Account } from '../structs/account';

/**
 * Request-scoped cache for permission data
 * Stores data in memory for the duration of a single HTTP request
 */
export class RequestCache {
	private cache = new Map<string, unknown>();

	get<T>(key: string): T | undefined {
		return this.cache.get(key) as T | undefined;
	}

	set<T>(key: string, value: T): void {
		this.cache.set(key, value);
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	clear(): void {
		this.cache.clear();
	}
}

/**
 * Permission cache with three-level caching
 */
export namespace PermissionCache {
	const REDIS_TTL = 300; // 5 minutes in seconds
	const REDIS_PREFIX = 'perm:';

	/**
	 * Helper function to save account rulesets to cache
	 */
	const cacheAccountRulesets = async (
		accountId: string,
		rulesets: (Permissions.RoleRulesetData | Permissions.AccountRulesetData)[],
		requestCache?: RequestCache
	) => {
		const cacheKey = `account-rulesets:${accountId}`;
		const redisKey = `${REDIS_PREFIX}${cacheKey}`;

		// Serialize for Redis
		const serialized = rulesets.map((r) => ({
			struct: r.struct.name,
			data: r.data,
			id: r.id
		}));

		// Store in Redis
		await redis.set(redisKey, JSON.stringify(serialized), REDIS_TTL);

		// Store in request cache
		requestCache?.set(cacheKey, rulesets);

		return rulesets;
	};

	/**
	 * Get account rulesets with multi-level caching
	 * @param accountId - Account ID to get rulesets for
	 * @param requestCache - Optional request-scoped cache
	 * @returns Array of rulesets (RoleRulesetData | AccountRulesetData)
	 */
	export const getAccountRulesets = (accountId: string, requestCache?: RequestCache) => {
		return attemptAsync(async () => {
			const cacheKey = `account-rulesets:${accountId}`;

			// Level 1: Check request cache
			if (requestCache?.has(cacheKey)) {
				return requestCache.get<
					(Permissions.RoleRulesetData | Permissions.AccountRulesetData)[]
				>(cacheKey)!;
			}

			// Level 2: Check Redis cache
			const redisKey = `${REDIS_PREFIX}${cacheKey}`;
			const cached = await redis.get(redisKey);
			if (cached) {
				try {
					const parsed = JSON.parse(cached);
					// Reconstruct StructData objects from cached data
					const rulesets = parsed.map((item: { struct: string; data: unknown; id: string }) => {
						if (item.struct === 'role_rulesets') {
							return Permissions.RoleRuleset.Generator(item.data);
						} else {
							return Permissions.AccountRuleset.Generator(item.data);
						}
					});
					
					// Store in request cache
					requestCache?.set(cacheKey, rulesets);
					return rulesets;
				} catch (error) {
					// If parsing fails, fall through to database
					console.warn('Failed to parse cached rulesets:', error);
				}
			}

			// Level 3: Fetch from database
			const accountData = { id: accountId } as Account.AccountData;
			const rulesets = await Permissions.getRulesetsFromAccount(accountData).unwrap();
			
			// Cache the result
			return cacheAccountRulesets(accountId, rulesets, requestCache);
		});
	};

	/**
	 * Get all entitlements with multi-level caching
	 * @param requestCache - Optional request-scoped cache
	 * @returns Array of entitlements
	 */
	export const getEntitlements = (requestCache?: RequestCache) => {
		return attemptAsync(async () => {
			const cacheKey = 'all-entitlements';

			// Level 1: Check request cache
			if (requestCache?.has(cacheKey)) {
				return requestCache.get<Permissions.EntitlementData[]>(cacheKey)!;
			}

			// Level 2: Check Redis cache
			const redisKey = `${REDIS_PREFIX}${cacheKey}`;
			const cached = await redis.get(redisKey);
			if (cached) {
				try {
					const parsed = JSON.parse(cached);
					// Reconstruct EntitlementData objects from cached data
					const entitlements = parsed.map((item: { data: unknown }) => {
						return Permissions.Entitlement.Generator(item.data);
					});
					
					// Store in request cache
					requestCache?.set(cacheKey, entitlements);
					return entitlements;
				} catch (error) {
					// If parsing fails, fall through to database
					console.warn('Failed to parse cached entitlements:', error);
				}
			}

			// Level 3: Fetch from database
			const entitlements = await Permissions.Entitlement.all({ type: 'all' }).unwrap();
			
			// Cache the result
			const serialized = entitlements.map((e) => ({
				data: e.data,
				id: e.id
			}));
			await redis.set(redisKey, JSON.stringify(serialized), REDIS_TTL);
			requestCache?.set(cacheKey, entitlements);
			
			return entitlements;
		});
	};

	/**
	 * Invalidate account rulesets cache
	 * @param accountId - Account ID to invalidate cache for
	 */
	export const invalidateAccountRulesets = async (accountId: string) => {
		const redisKey = `${REDIS_PREFIX}account-rulesets:${accountId}`;
		await redis.del(redisKey);
	};

	/**
	 * Invalidate all entitlements cache
	 */
	export const invalidateEntitlements = async () => {
		const redisKey = `${REDIS_PREFIX}all-entitlements`;
		await redis.del(redisKey);
	};
}
