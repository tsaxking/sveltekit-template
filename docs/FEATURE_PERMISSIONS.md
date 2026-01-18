# Feature Permission System

This document describes the newly implemented feature permission system with multi-level caching.

## Overview

The feature permission system provides a strongly-typed, flexible way to define business-level permissions separate from CRUD operations. It includes:

- **Type-safe feature registration** with automatic TypeScript type generation
- **Multi-level caching** (request-level + Redis) for high performance
- **Custom business logic** checks with Zod schema validation
- **Automatic cache invalidation** when permissions change

## Quick Start

### 1. Register a Feature

Features are registered in `src/lib/server/features/index.ts`:

```typescript
import { Features } from '../services/features';
import { z } from 'zod';
import { Account } from '../structs/account';

// Simple feature without scopes
Features.register({
  name: 'access-admin-panel',
  description: 'Access to the admin panel'
});

// Feature with typed scopes
Features.register({
  name: 'upload-file',
  description: 'Upload files to the server',
  scopes: {
    type: z.enum(['pdf', 'image', 'csv', 'video']),
    maxSize: z.number().positive()
  },
  check: async (account, { type, maxSize }) => {
    const MAX_FREE_SIZE = 5 * 1024 * 1024; // 5MB
    const isAdmin = (await Account.isAdmin(account)).unwrapOr(false);

    if (maxSize > MAX_FREE_SIZE) return isAdmin;
    if (type === 'video') return isAdmin;
    return true;
  }
});
```

### 2. Check Permissions

Use the type-safe `Features.can()` method:

```typescript
import { Features } from '$lib/server/services/features';

// Simple feature (no scopes required)
const canAccessAdmin = await Features.can(account, 'access-admin-panel');

// Feature with scopes - TypeScript enforces correct types!
const canUpload = await Features.can(account, 'upload-file', {
  type: 'pdf',      // TypeScript knows valid values
  maxSize: 5000000
});
```

### 3. Use Cached Permission Checks

For CRUD permissions, use the new `canWithCache` function:

```typescript
import { Permissions } from '$lib/server/structs/permissions';
import { DataAction } from 'drizzle-struct/types';

// Check with caching
const canUpdate = await Permissions.canWithCache(
  account,
  DataAction.Update,
  structData,
  undefined,
  event.locals.permissionCache  // Request-level cache
);
```

## Architecture

### Feature Registry

Located at `src/lib/server/services/features.ts`, the registry:

- Maintains a map of registered features
- Generates TypeScript types to `src/lib/types/features.ts`
- Validates scopes using Zod schemas
- Executes custom check functions

**Type Generation:**
The registry automatically generates:
- `FeatureName` - Union type of all feature names
- `FeatureScopes` - Interface mapping features to scope types
- `FEATURE_METADATA` - Const object with feature descriptions

### Multi-Level Caching

Located at `src/lib/server/services/permission-cache.ts`:

**Level 1: Request Cache**
- In-memory Map-based storage
- Max 1000 entries with FIFO eviction
- Automatically created per request
- Cleared when request completes

**Level 2: Redis Cache**
- Distributed cache using existing redis service
- Configurable TTLs per cache type
- Prefix: `perm:`

**Cache Keys and TTLs:**
```
perm:entitlements:all                          (3600s / 1 hour)
perm:rulesets:{accountId}                      (300s / 5 minutes)
perm:check:{accountId}:{action}:{resourceId}   (60s / 1 minute)
perm:feature:{accountId}:{feature}:{scopes}    (60s / 1 minute)
```

### Cache Invalidation

Automatic invalidation hooks in `src/lib/server/structs/permissions.ts`:

```typescript
// Entitlements
Entitlement.on('create', async () => {
  await PermissionCache.invalidateEntitlements().unwrap();
});

// Role rulesets
RoleRuleset.on('create', async (ruleset) => {
  // Invalidate for all accounts with this role
});

// Role assignments
RoleAccount.on('create', async (ra) => {
  await PermissionCache.invalidateAccountRulesets(ra.data.account).unwrap();
  await PermissionCache.invalidateAllAccountChecks(ra.data.account).unwrap();
});
```

## API Reference

### Features.register()

Register a new feature:

```typescript
Features.register({
  name: string,
  description: string,
  scopes?: ZodRawShape,
  check?: (account, scopes) => Promise<boolean>
});
```

### Features.can()

Check if account has permission for a feature:

```typescript
Features.can<Name>(
  account: Account.AccountData,
  featureName: Name,
  ...scopes: ConditionalScopes<Name>
): Promise<boolean>
```

### PermissionCache

Cache management functions:

```typescript
// Cache getters
PermissionCache.getEntitlements(requestCache?)
PermissionCache.getAccountRulesets(accountId, requestCache?)
PermissionCache.getCachedPermissionCheck(accountId, action, resourceId, requestCache?)
PermissionCache.getCachedFeatureCheck(accountId, feature, scopes, requestCache?)

// Cache setters
PermissionCache.cachePermissionCheck(accountId, action, resourceId, result, requestCache?)
PermissionCache.cacheFeatureCheck(accountId, feature, scopes, result, requestCache?)

// Invalidation
PermissionCache.invalidateEntitlements()
PermissionCache.invalidateAccountRulesets(accountId)
PermissionCache.invalidateAllAccountChecks(accountId)
PermissionCache.invalidateAllAccountFeatures(accountId)

// Monitoring
PermissionCache.getStats() // Returns { hits, misses, sets, invalidations, hitRate }
PermissionCache.clearAll() // Emergency clear
```

### Permissions.canWithCache()

Check CRUD permissions with caching:

```typescript
Permissions.canWithCache(
  account: Account.AccountData,
  action: DataAction | PropertyAction,
  data: StructData<any, any>,
  property?: string,
  requestCache?: RequestCache
): Promise<boolean>
```

## Examples

### Feature with Complex Scopes

```typescript
Features.register({
  name: 'export-data',
  description: 'Export data in various formats',
  scopes: {
    format: z.enum(['csv', 'json', 'pdf', 'excel']),
    scope: z.enum(['own', 'team', 'organization']),
    limit: z.number().int().positive().optional()
  },
  check: async (account, { format, scope, limit }) => {
    const isAdmin = (await Account.isAdmin(account)).unwrapOr(false);

    if (format === 'pdf') return isAdmin;
    if (scope === 'organization') return isAdmin;
    if (limit && limit > 10000) return isAdmin;

    return true;
  }
});

// Usage
const canExport = await Features.can(account, 'export-data', {
  format: 'csv',
  scope: 'own',
  limit: 500
});
```

### Using Request Cache

In a SvelteKit endpoint:

```typescript
export const GET = async ({ locals }) => {
  const { account, permissionCache } = locals;
  if (!account) return json({ error: 'Not authenticated' }, { status: 401 });

  // Use request cache for multiple permission checks
  const canUpload = await Features.can(account, 'upload-file', {
    type: 'pdf',
    maxSize: 1000000
  });

  const canExport = await Features.can(account, 'export-data', {
    format: 'csv',
    scope: 'own'
  });

  // Cache is automatically cleared when request completes
  return json({ canUpload, canExport });
};
```

### Monitoring Cache Performance

```typescript
import { PermissionCache } from '$lib/server/services/permission-cache';

// Get cache statistics
const stats = PermissionCache.getStats();
console.log(`Cache hit rate: ${stats.hitRate.toFixed(2)}%`);
console.log(`Total hits: ${stats.hits}`);
console.log(`Total misses: ${stats.misses}`);
console.log(`Total sets: ${stats.sets}`);
console.log(`Total invalidations: ${stats.invalidations}`);
```

## Performance Considerations

1. **Request Cache**: Fast in-memory lookups, cleared automatically
2. **Redis Cache**: Distributed cache with TTLs, survives server restarts
3. **FIFO Eviction**: Prevents memory bloat with 1000 entry limit
4. **Selective Invalidation**: Only invalidates affected accounts

## Type Safety

TypeScript enforces correct scope types at compile time:

```typescript
// ✓ Correct
await Features.can(account, 'upload-file', {
  type: 'pdf',
  maxSize: 5000000
});

// ✗ Compile error - wrong type
await Features.can(account, 'upload-file', {
  type: 'xml',  // Error: 'xml' is not assignable to type 'pdf' | 'image' | 'csv' | 'video'
  maxSize: 5000000
});

// ✗ Compile error - missing required scopes
await Features.can(account, 'upload-file');  // Error: Expected 2 arguments, got 1
```

## Backwards Compatibility

The existing permission system continues to work without changes. The new system is:
- **Opt-in**: Use `canWithCache` instead of `accountCanDo` for caching
- **Additive**: Features are separate from CRUD permissions
- **Non-breaking**: All existing code continues to function

## Testing

To test the feature permission system:

```typescript
// Test feature registration
const feature = Features.get('upload-file');
assert(feature !== undefined);

// Test permission check
const canUpload = await Features.can(testAccount, 'upload-file', {
  type: 'pdf',
  maxSize: 1000000
});

// Test cache
const stats = PermissionCache.getStats();
assert(stats.hitRate >= 0);
```

## Troubleshooting

**Types not generated:**
- Features are registered on server startup
- Check `src/lib/types/features.ts` is writable
- Look for errors in server logs

**Cache not invalidating:**
- Verify hooks are triggered (check logs)
- Redis must be running and accessible
- Check cache keys with Redis CLI

**Permission checks failing:**
- Verify feature is registered
- Check Zod schema validation
- Review custom check function logic
