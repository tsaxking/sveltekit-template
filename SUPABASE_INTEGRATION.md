# Supabase Integration Guide

## Overview

This document explains the compatibility between this infrastructure and Supabase, what changes are needed for integration, and how to maintain local server deployment capability.

## Current Infrastructure

### Database Stack
- **PostgreSQL**: Core database system
- **Drizzle ORM**: Type-safe ORM providing database abstraction
- **drizzle-struct**: Custom ORM wrapper adding:
  - Object-oriented structure
  - Built-in permissions system
  - Event hooks (onCreate, onUpdate, onDelete)
  - Registry pattern for frontend access
  - Type-safe data operations

### Key Features
1. **Authentication**: Custom session-based auth with cookies
2. **Permissions**: Hierarchical role-based access control (RBAC)
3. **Rate Limiting**: Multi-layer (IP, session, fingerprint, account) with Redis
4. **Struct System**: Unified pattern for database schemas and business logic
5. **Local Deployment**: Self-hosted PostgreSQL + Redis

## Supabase Compatibility Analysis

### ✅ Compatible Components

#### 1. **Database (PostgreSQL)**
- Supabase uses PostgreSQL under the hood
- Your Drizzle ORM schemas will work directly with Supabase
- Connection string is the only required change

#### 2. **Drizzle ORM**
- Fully compatible with Supabase's PostgreSQL
- Drizzle can connect to Supabase using the connection pooler
- No changes needed to your Drizzle schemas

### ⚠️ Overlapping Features (Choose One Approach)

#### 1. **Authentication**
**Current**: Custom session-based auth with `Account` and `Session` structs
**Supabase**: Built-in Auth service with JWT tokens

**Options**:
- **A) Keep Custom Auth**: Continue using your struct-based auth, ignore Supabase Auth
- **B) Use Supabase Auth**: Replace your auth system with Supabase Auth (breaking change)
- **C) Hybrid**: Use Supabase Auth for authentication, keep custom Session tracking

#### 2. **Row-Level Security (RLS)**
**Current**: Application-level permissions via `Permissions` struct
**Supabase**: Database-level RLS policies

**Options**:
- **A) Keep Application-Level**: Continue using struct-based permissions (more flexible)
- **B) Use RLS**: Migrate to Supabase RLS policies (better for security)
- **C) Both**: Use RLS for basic security, application permissions for complex logic

#### 3. **Realtime**
**Current**: Custom SSE (Server-Sent Events) implementation
**Supabase**: Built-in Realtime service (WebSocket-based)

**Options**:
- **A) Keep SSE**: Continue with your implementation
- **B) Use Supabase Realtime**: Replace SSE with Supabase Realtime
- **C) Both**: Use both for different use cases

### ❌ Non-Compatible Features

#### 1. **drizzle-struct Event Hooks**
Supabase doesn't know about your struct event system. These will continue to work at the application level but won't trigger from:
- Direct database changes
- Supabase Studio edits
- RLS policy actions

**Solution**: Keep using application-level hooks for your app's operations

#### 2. **Redis Rate Limiting**
Supabase doesn't provide Redis. You'll need to:
- **A) Keep self-hosted Redis**: Continue using your current setup
- **B) Use Upstash Redis**: Hosted Redis compatible with your code
- **C) Use Supabase Edge Functions**: Implement rate limiting there (requires rewrite)

## Integration Strategies

### Strategy 1: Minimal Change (Recommended for Local Deployment)

**Keep your current architecture, just point to Supabase database**

**Pros**:
- Minimal code changes
- Keep all your custom logic
- Works with local deployment
- No breaking changes

**Cons**:
- Don't leverage Supabase Auth, Realtime, Storage
- Need to maintain Redis separately

**Changes Required**:
```typescript
// Update drizzle.config.ts to use Supabase connection string
export default defineConfig({
  schema: './src/lib/server/structs/*.ts',
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL, // or from config.json
  },
  dialect: 'postgresql',
});

// Update src/lib/server/db/index.ts
export const client = postgres(config.database.supabaseUrl || {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.pass
});
```

**Config Update**:
```json
{
  "database": {
    "provider": "postgres", // or "supabase"
    "supabaseUrl": "postgresql://...", // optional
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "pass": "password",
    "name": "mydb"
  }
}
```

### Strategy 2: Hybrid Approach

**Use Supabase for infrastructure, keep custom business logic**

**Pros**:
- Get Supabase benefits (hosting, backups, dashboard)
- Keep your struct patterns
- Use Supabase Auth (modern, secure)

**Cons**:
- More changes required
- Need to migrate authentication
- Potential breaking changes for users

**Changes Required**:
1. Add Supabase client SDK
2. Replace auth with Supabase Auth
3. Keep struct system for business logic
4. Use Supabase Realtime instead of SSE
5. Consider RLS policies for security

### Strategy 3: Full Migration

**Replace custom components with Supabase equivalents**

**Pros**:
- Fully leverage Supabase ecosystem
- Less custom code to maintain
- Better scalability

**Cons**:
- Major rewrite required
- Lose drizzle-struct benefits
- Complex migration path
- May not meet local deployment requirement

**Not recommended** given your local deployment requirement.

## Local Deployment with Supabase

Supabase provides [local development](https://supabase.com/docs/guides/cli/local-development) via Docker:

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase (PostgreSQL, Auth, Storage, etc.)
supabase start

# Get connection details
supabase status
```

This gives you:
- Local PostgreSQL (port 54322)
- Local Auth service
- Local Storage
- Local Studio UI
- All running in Docker

**Integration**:
```typescript
// config.json for local development
{
  "database": {
    "host": "localhost",
    "port": 54322,
    "user": "postgres",
    "pass": "postgres",
    "name": "postgres"
  }
}
```

Your Drizzle ORM and struct system will work identically with local Supabase PostgreSQL.

## Recommended Approach for Your Use Case

### Phase 1: Database Connection (Minimal Change)
1. Add Supabase connection option to config
2. Update database client to support both connection methods
3. Test with local Supabase PostgreSQL
4. **Result**: Your app works with both vanilla PostgreSQL and Supabase

### Phase 2: Optional Features (As Needed)
1. Consider Supabase Auth if you want OAuth providers
2. Consider Supabase Storage if you need file hosting
3. Consider Supabase Realtime for WebSocket subscriptions
4. Keep drizzle-struct for business logic

### Phase 3: Production Deployment
1. Local: Use `supabase start` for development
2. Staging: Use Supabase hosted instance
3. Production: Choose between self-hosted PostgreSQL or Supabase

## Implementation Steps

### 1. Update Configuration Schema

Add Supabase support to `config/config.schema.json`:

```json
{
  "database": {
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["postgres", "supabase"],
        "description": "Database provider"
      },
      "connectionUrl": {
        "type": "string",
        "description": "Full connection URL (for Supabase)"
      },
      "host": {
        "type": "string",
        "description": "Database host (for direct connection)"
      },
      // ... existing fields
    }
  }
}
```

### 2. Update Database Client

Create adapter pattern in `src/lib/server/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../utils/env';

export const client = config.database.connectionUrl
  ? postgres(config.database.connectionUrl) // Supabase or any connection string
  : postgres({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: config.database.user,
      password: config.database.pass
    });

export const DB = drizzle(client);
```

### 3. Update Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import { config } from './src/lib/server/utils/env';

export default defineConfig({
  schema: './src/lib/server/structs/*.ts',
  dbCredentials: config.database.connectionUrl
    ? { url: config.database.connectionUrl }
    : {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.pass,
        database: config.database.name,
        ssl: false
      },
  dialect: 'postgresql',
});
```

### 4. Testing

```bash
# Test with local PostgreSQL
pnpm dev

# Test with local Supabase
supabase start
# Update config.json with Supabase connection
pnpm dev

# Test with hosted Supabase
# Update config.json with Supabase connection URL
pnpm dev
```

## FAQ

### Q: Do I need to change my drizzle-struct code?
**A**: No. drizzle-struct works with any PostgreSQL connection, including Supabase.

### Q: Will my permissions system work with Supabase?
**A**: Yes. Your application-level permissions in the `Permissions` struct will continue to work. You can optionally add RLS policies for defense-in-depth.

### Q: Can I use Supabase Auth with my current session system?
**A**: Yes, but you'd need to:
1. Use Supabase Auth for login/signup
2. Store the Supabase JWT in your `Session` struct
3. Verify the JWT on each request
4. Keep your session tracking for analytics

### Q: What about Redis rate limiting?
**A**: Supabase doesn't provide Redis. Options:
1. Keep self-hosted Redis (works locally and in production)
2. Use Upstash Redis (hosted, serverless)
3. Implement rate limiting in Supabase Edge Functions

### Q: Can I deploy this on my own server with Supabase?
**A**: Yes, use Supabase local development (Docker) for full self-hosting, or use Supabase cloud with your app on your server.

### Q: Will migrations work?
**A**: Yes. Drizzle migrations work with Supabase PostgreSQL:
```bash
pnpm db:push  # Push schema to Supabase
pnpm db:migrate  # Run migrations on Supabase
```

## Conclusion

**Your infrastructure IS compatible with Supabase.** The minimal change approach (Strategy 1) allows you to:

1. ✅ Keep your drizzle-struct architecture
2. ✅ Keep your permissions system
3. ✅ Keep your rate limiting
4. ✅ Deploy locally (via Supabase Docker)
5. ✅ Deploy to Supabase cloud (optional)
6. ✅ Use Supabase features when needed (Auth, Storage, Realtime)

**You don't need to change anything** to integrate Supabase at the database level. Just update the connection string, and everything will work. The other Supabase features (Auth, Storage, Realtime) are optional and can be adopted incrementally.

## Next Steps

1. Try local Supabase: `supabase init && supabase start`
2. Update config.json with local Supabase connection
3. Run your app: `pnpm dev`
4. Verify everything works
5. Decide which Supabase features (if any) you want to adopt

## Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
