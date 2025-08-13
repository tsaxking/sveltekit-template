# account.ts

User account management system providing authentication, user profiles, permissions, and related functionality. This module defines the core Account struct along with associated structures for admin privileges, developer access, notifications, settings, and password management.

## File Overview

This file implements a comprehensive user account system built on Drizzle Struct. It handles user registration, authentication, profile management, role-based permissions (admin/developer), account notifications, settings storage, and password reset functionality. The system includes automatic cleanup of related data when accounts are deleted.

## Core Structures

### `Account.Account`
```ts
export const Account = new Struct({
  name: 'account',
  structure: {
    username: text('username').notNull().unique(),
    key: text('key').notNull().unique(),
    salt: text('salt').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    verified: boolean('verified').notNull(),
    verification: text('verification').notNull(),
    lastLogin: text('last_login').notNull().default('')
  }
})
```

**Description:** Core user account structure containing authentication credentials, profile information, and verification status.

### `Account.Admins`
```ts
export const Admins = new Struct({
  name: 'admins',
  structure: {
    accountId: text('account_id').notNull().unique()
  }
})
```

**Description:** Admin privilege tracking - links account IDs to admin status.

### `Account.Developers`
```ts
export const Developers = new Struct({
  name: 'developers',
  structure: {
    accountId: text('account_id').notNull().unique()
  }
})
```

**Description:** Developer privilege tracking - links account IDs to developer access.

## Permission Functions

### `isAdmin`
```ts
export const isAdmin = (account: AccountData) => Promise<boolean>
```

**Description:** Checks if an account has admin privileges.

**Parameters:**

| Name | Description |
|------|-------------|
| account | Account data object to check |

**Returns:** Promise resolving to true if account is admin, false otherwise

### `isDeveloper`
```ts
export const isDeveloper = (account: AccountData) => Promise<boolean>
```

**Description:** Checks if an account has developer privileges.

**Parameters:**

| Name | Description |
|------|-------------|
| account | Account data object to check |

**Returns:** Promise resolving to true if account is developer, false otherwise

### `getAdmins`
```ts
export const getAdmins = () => Promise<AccountData[]>
```

**Description:** Retrieves all accounts with admin privileges.

**Returns:** Promise resolving to array of admin account data

### `getDevelopers`
```ts
export const getDevelopers = () => Promise<AccountData[]>
```

**Description:** Retrieves all accounts with developer privileges.

**Returns:** Promise resolving to array of developer account data

## Account Management Functions

### `createAccount`
```ts
export const createAccount = (data: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
}) => Promise<AccountData>
```

**Description:** Creates a new user account with hashed password and verification token.

**Parameters:**

| Name | Description |
|------|-------------|
| data.username | Unique username for the account |
| data.password | Plain text password (will be hashed) |
| data.firstName | User's first name |
| data.lastName | User's last name |
| data.email | Unique email address |

**Returns:** Promise resolving to created account data

### `createAccountFromOauth`
```ts
export const createAccountFromOauth = (data: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}) => Promise<AccountData>
```

**Description:** Creates account from OAuth authentication (no password required).

### `searchAccounts`
```ts
export const searchAccounts = (query: string) => Promise<AccountData[]>
```

**Description:** Searches accounts by username, email, first name, or last name.

**Parameters:**

| Name | Description |
|------|-------------|
| query | Search query string |

**Returns:** Promise resolving to matching accounts (limited to 100 results)

## Password Management

### `newHash`
```ts
export const newHash = (password: string) => { key: string; salt: string }
```

**Description:** Generates new password hash with random salt.

**Parameters:**

| Name | Description |
|------|-------------|
| password | Plain text password to hash |

**Returns:** Object containing hashed key and salt

### `hash`
```ts
export const hash = (password: string, salt: string) => string
```

**Description:** Hashes password with provided salt.

### `requestPasswordReset`
```ts
export const requestPasswordReset = (account: AccountData) => Promise<void>
```

**Description:** Initiates password reset process by sending reset email.

## Notification System

### `notifyPopup`
```ts
export const notifyPopup = (accountId: string, notification: Notification) => Promise<void>
```

**Description:** Sends real-time popup notification to user via SSE.

### `sendAccountNotif`
```ts
export const sendAccountNotif = (accountId: string, notification: Notification) => Promise<void>
```

**Description:** Stores persistent notification for user account.

## Utility Functions

### `isOnline`
```ts
export const isOnline = (accountId: string) => Promise<boolean>
```

**Description:** Checks if user is currently online based on active sessions.

### `getAccountInfo`
```ts
export const getAccountInfo = (account: AccountData) => Promise<AccountInfoData>
```

**Description:** Retrieves extended account information and profile data.

### `getSettings`
```ts
export const getSettings = (accountId: string) => Promise<SettingsData>
```

**Description:** Retrieves user's personal settings and preferences.

## Type Definitions

### `AccountData`
```ts
export type AccountData = typeof Account.sample
```

**Description:** TypeScript type for account data objects.

### `AccountInfoData`
```ts
export type AccountInfoData = typeof AccountInfo.sample
```

**Description:** TypeScript type for extended account information objects.
