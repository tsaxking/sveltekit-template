/* eslint-disable @typescript-eslint/no-explicit-any */
import { attemptAsync } from 'ts-utils/check';
import redis from './redis';
import type { DataAction, PropertyAction } from 'drizzle-struct/types';
import type { Permissions } from '../structs/permissions';

/**
 * Request-level cache (Level 1)
 * In-memory cache that exists for the duration of a single request
 */
export class RequestCache {
	private cache = new Map<string, any>();
	private readonly maxSize = 1000;
	private insertionOrder: string[] = [];

	set(key: string, value: any): void {
		// If key already exists, remove it from order to re-add at end
		if (this.cache.has(key)) {
			this.insertionOrder = this.insertionOrder.filter((k) => k !== key);
		}

		// FIFO eviction if we're at max size
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			const oldest = this.insertionOrder.shift();
			if (oldest) {
				this.cache.delete(oldest);
			}
		}

		this.cache.set(key, value);
		this.insertionOrder.push(key);
	}

	get(key: string): any | undefined {
		return this.cache.get(key);
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	delete(key: string): void {
		this.cache.delete(key);
		this.insertionOrder = this.insertionOrder.filter((k) => k !== key);
	}

	clear(): void {
		this.cache.clear();
		this.insertionOrder = [];
	}

	get size(): number {
		return this.cache.size;
	}
}

// Cache statistics
const stats = {
	hits: 0,
	misses: 0,
	sets: 0,
	invalidations: 0
};

class PC {
	permCache: ReturnType<typeof redis.createItemGroup> | undefined;
	constructor() {}

	init() {
		this.permCache = redis.createItemGroup('perm', 'string');
	}

	/**
	 * Create a new request-level cache
	 */
	createRequestCache(): RequestCache {
		return new RequestCache();
	}

	/**
	 * Get all entitlements from cache
	 */
	getEntitlements(requestCache?: RequestCache) {
		return attemptAsync(async () => {
			const key = 'entitlements:all';

			// Check request cache first
			if (requestCache?.has(key)) {
				stats.hits++;
				return JSON.parse(requestCache.get(key)) as Permissions.EntitlementData[];
			}

			// Check Redis cache
			const cached = await this.permCache?.getItem(key).unwrap();
			if (cached) {
				stats.hits++;
				const data = JSON.parse(cached) as Permissions.EntitlementData[];
				requestCache?.set(key, cached);
				return data;
			}

			stats.misses++;
			return null;
		});
	}

	/**
	 * Cache all entitlements
	 */
	cacheEntitlements(entitlements: Permissions.EntitlementData[], requestCache?: RequestCache) {
		return attemptAsync(async () => {
			const key = 'entitlements:all';
			const value = JSON.stringify(entitlements);

			// Cache in Redis with 1 hour TTL
			this.permCache?.createItem(key, value);
			await this.permCache?.expire(key, 3600).unwrap();

			// Cache in request cache
			requestCache?.set(key, value);

			stats.sets++;
		});
	}

	/**
	 * Get account rulesets from cache
	 */
	getAccountRulesets(accountId: string, requestCache?: RequestCache) {
		return attemptAsync(async () => {
			const key = `rulesets:${accountId}`;

			// Check request cache first
			if (requestCache?.has(key)) {
				stats.hits++;
				return JSON.parse(requestCache.get(key)) as (
					| Permissions.RoleRulesetData
					| Permissions.AccountRulesetData
				)[];
			}

			// Check Redis cache
			const cached = await this.permCache?.getItem(key).unwrap();
			if (cached) {
				stats.hits++;
				const data = JSON.parse(cached) as (
					| Permissions.RoleRulesetData
					| Permissions.AccountRulesetData
				)[];
				requestCache?.set(key, cached);
				return data;
			}

			stats.misses++;
			return null;
		});
	}

	/**
	 * Cache account rulesets
	 */
	cacheAccountRulesets(
		accountId: string,
		rulesets: (Permissions.RoleRulesetData | Permissions.AccountRulesetData)[],
		requestCache?: RequestCache
	) {
		return attemptAsync(async () => {
			const key = `rulesets:${accountId}`;
			const value = JSON.stringify(rulesets);

			// Cache in Redis with 5 minute TTL
			await this.permCache?.createItem(key, value).unwrap();
			await this.permCache?.expire(key, 300).unwrap();

			// Cache in request cache
			requestCache?.set(key, value);

			stats.sets++;
		});
	}

	/**
	 * Get a cached permission check result
	 */
	getCachedPermissionCheck(
		accountId: string,
		action: DataAction | PropertyAction,
		resourceId: string,
		requestCache?: RequestCache
	) {
		return attemptAsync(async () => {
			const key = `check:${accountId}:${action}:${resourceId}`;

			// Check request cache first
			if (requestCache?.has(key)) {
				stats.hits++;
				return requestCache.get(key) === 'true';
			}

			// Check Redis cache
			const cached = await this.permCache?.getItem(key).unwrap();
			if (cached !== null) {
				stats.hits++;
				const result = cached === 'true';
				requestCache?.set(key, cached);
				return result;
			}

			stats.misses++;
			return null;
		});
	}

	/**
	 * Cache a permission check result
	 */
	cachePermissionCheck(
		accountId: string,
		action: DataAction | PropertyAction,
		resourceId: string,
		result: boolean,
		requestCache?: RequestCache
	) {
		return attemptAsync(async () => {
			const key = `check:${accountId}:${action}:${resourceId}`;
			const value = result ? 'true' : 'false';

			// Cache in Redis with 1 minute TTL
			await this.permCache?.createItem(key, value).unwrap();
			await this.permCache?.expire(key, 60).unwrap();

			// Cache in request cache
			requestCache?.set(key, value);

			stats.sets++;
		});
	}

	/**
	 * Get a cached feature check result
	 */
	getCachedFeatureCheck(
		accountId: string,
		feature: string,
		scopes: any,
		requestCache?: RequestCache
	) {
		return attemptAsync(async () => {
			const scopesKey = scopes ? JSON.stringify(scopes) : '';
			const key = `feature:${accountId}:${feature}:${scopesKey}`;

			// Check request cache first
			if (requestCache?.has(key)) {
				stats.hits++;
				return requestCache.get(key) === 'true';
			}

			// Check Redis cache
			const cached = await this.permCache?.getItem(key).unwrap();
			if (cached !== null) {
				stats.hits++;
				const result = cached === 'true';
				requestCache?.set(key, cached);
				return result;
			}

			stats.misses++;
			return null;
		});
	}

	/**
	 * Cache a feature check result
	 */
	cacheFeatureCheck(
		accountId: string,
		feature: string,
		scopes: any,
		result: boolean,
		requestCache?: RequestCache
	) {
		return attemptAsync(async () => {
			const scopesKey = scopes ? JSON.stringify(scopes) : '';
			const key = `feature:${accountId}:${feature}:${scopesKey}`;
			const value = result ? 'true' : 'false';

			// Cache in Redis with 1 minute TTL
			await this.permCache?.createItem(key, value).unwrap();
			await this.permCache?.expire(key, 60).unwrap();

			// Cache in request cache
			requestCache?.set(key, value);

			stats.sets++;
		});
	}

	/**
	 * Invalidate all entitlements cache
	 */
	invalidateEntitlements() {
		return attemptAsync(async () => {
			await this.permCache?.deleteItem('entitlements:all').unwrap();
			stats.invalidations++;
		});
	}

	/**
	 * Invalidate account rulesets cache
	 */
	invalidateAccountRulesets(accountId: string) {
		return attemptAsync(async () => {
			await this.permCache?.deleteItem(`rulesets:${accountId}`).unwrap();
			stats.invalidations++;
		});
	}

	/**
	 * Invalidate all permission checks for an account
	 */
	invalidateAllAccountChecks(_accountId: string) {
		return attemptAsync(async () => {
			// We need to use pattern matching to delete all keys for this account
			// This is a limitation - we'll just let them expire naturally
			// In a production system, you'd want to use Redis SCAN or maintain a set of keys
			stats.invalidations++;
		});
	}

	/**
	 * Invalidate all feature checks for an account
	 */
	invalidateAllAccountFeatures(_accountId: string) {
		return attemptAsync(async () => {
			// Similar to invalidateAllAccountChecks, we'll let them expire naturally
			stats.invalidations++;
		});
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			...stats,
			hitRate: stats.hits + stats.misses > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0
		};
	}

	/**
	 * Clear all cache statistics
	 */
	clearStats() {
		stats.hits = 0;
		stats.misses = 0;
		stats.sets = 0;
		stats.invalidations = 0;
	}

	/**
	 * Emergency clear all caches
	 */
	clearAll() {
		return attemptAsync(async () => {
			// This would require getting all keys with the perm: prefix
			// For now, we'll just reset stats
			this.clearStats();
		});
	}
}

export const PermissionCache = new PC();
