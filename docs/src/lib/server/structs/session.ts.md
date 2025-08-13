# session.ts

User session management system providing authentication state tracking, session persistence, and user sign-in functionality. This module handles HTTP cookie-based sessions with automatic creation and management.

## File Overview

This file implements session management for user authentication using HTTP cookies and database persistence. It provides session creation, retrieval, and sign-in functionality while tracking user activity and maintaining authentication state across requests.

## Core Structure

### `Session.Session`
```ts
export const Session = new Struct({
  name: 'session',
  structure: {
    accountId: text('account_id').notNull(),
    ip: text('ip').notNull(),
    userAgent: text('user_agent').notNull(),
    requests: integer('requests').notNull(),
    prevUrl: text('prev_url').notNull(),
    fingerprint: text('fingerprint').notNull().default(''),
    tabs: integer('tabs').notNull().default(0)
  },
  frontend: false,
  safes: ['fingerprint']
})
```

**Description:** Session data structure storing user authentication state and tracking information.

**Fields:**
- `accountId`: ID of the associated user account (empty string for unauthenticated sessions)
- `ip`: Client IP address
- `userAgent`: Client browser user agent
- `requests`: Number of requests made in this session
- `prevUrl`: Previously visited URL
- `fingerprint`: Browser fingerprint for security (marked as safe/sensitive)
- `tabs`: Number of open browser tabs

## Session Management Functions

### `getSession`
```ts
export const getSession = (event: RequestEvent) => Promise<SessionData>
```

**Description:** Retrieves or creates a session for the current HTTP request. Automatically handles session creation if no valid session exists.

**Parameters:**

| Name | Description |
|------|-------------|
| event | SvelteKit RequestEvent containing cookies and request data |

**Returns:** Promise resolving to session data (either existing or newly created)

**Process:**
1. Checks for existing session cookie (`ssid_` + domain)
2. If no cookie exists, creates new session
3. If cookie exists but session not found in database, creates new session
4. Sets/updates session cookie with expiration based on `SESSION_DURATION` environment variable

### `getAccount`
```ts
export const getAccount = (session: SessionData) => Promise<Account.AccountData | null>
```

**Description:** Retrieves the account associated with a session.

**Parameters:**

| Name | Description |
|------|-------------|
| session | Session data object |

**Returns:** Promise resolving to account data if session is authenticated, null otherwise

### `signIn`
```ts
export const signIn = async (account: Account.AccountData, session: SessionData) => Promise<{session: SessionData}>
```

**Description:** Associates an account with a session, completing the sign-in process.

**Parameters:**

| Name | Description |
|------|-------------|
| account | Account data to associate with session |
| session | Session to update with account information |

**Returns:** Promise resolving to object containing updated session

**Process:**
1. Updates session with account ID
2. Updates account's last login timestamp
3. Returns updated session data

## Type Definitions

### `SessionData`
```ts
export type SessionData = typeof Session.sample
```

**Description:** TypeScript type for session data objects.

### `RequestEvent` (Interface)
```ts
interface RequestEvent {
  cookies: {
    get: (name: string) => string | undefined;
    set: (name: string, value: string, options: CookieOptions) => void;
  };
  request: Request;
}
```

**Description:** Interface defining the structure of SvelteKit request events used for session management.

## Environment Configuration

The session system uses the following environment variables:
- `PUBLIC_DOMAIN`: Domain for session cookies
- `SESSION_DURATION`: Session expiration time in milliseconds

## Security Features

- HTTP-only session cookies
- Domain-restricted cookies
- Automatic session expiration
- Fingerprint tracking for security
- Safe handling of sensitive session data
