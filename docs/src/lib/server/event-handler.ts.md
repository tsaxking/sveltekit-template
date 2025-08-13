# event-handler.ts

Centralized event handling system providing standardized API responses, error handling, and status codes for SvelteKit API routes. This module defines consistent response formats and error handling patterns used throughout the application.

## File Overview

This file provides a standardized way to handle API events and responses in the SvelteKit application. It defines error codes, success codes, and helper functions for creating consistent JSON responses with appropriate HTTP status codes.

## Enums

### `EventErrorCode`
```ts
export enum EventErrorCode {
  NoStruct = 'no_struct',
  NoAccount = 'no_account', 
  InvalidBody = 'invalid_body',
  NoData = 'no_data',
  InternalError = 'internal_error',
  NotPermitted = 'not_permitted',
  NoVersion = 'no_version',
  InvalidAction = 'invalid_action',
  Unknown = 'unknown',
  Blocked = 'blocked'
}
```

**Description:** Enumeration of standard error codes used across API responses to provide consistent error identification.

### `EventSuccessCode`
```ts
export enum EventSuccessCode {
  OK = 'ok'
}
```

**Description:** Enumeration of success codes for API responses.

## Response Functions

### `status`
```ts
export const status = (
  status: {
    success: boolean;
    code: EventSuccessCode | EventErrorCode;
    message?: string;
    data?: unknown;
    errors?: unknown;
  },
  init: { status: number }
) => Response
```

**Description:** Creates a standardized JSON response with the specified status and HTTP status code.

**Parameters:**

| Name | Description |
|------|-------------|
| status.success | Boolean indicating if the operation was successful |
| status.code | Success or error code from the respective enums |
| status.message | Optional human-readable message |
| status.data | Optional response data payload |
| status.errors | Optional error details |
| init.status | HTTP status code for the response |

**Returns:** SvelteKit JSON response object

## Error Handlers

### `Errors`
```ts
export const Errors = {
  noFrontend: (structName: string) => Response,
  noStruct: (structName: string) => Response,
  noAccount: () => Response,
  invalidBody: (errors?: unknown) => Response,
  noData: () => Response,
  internalError: (error?: unknown) => Response,
  notPermitted: () => Response,
  noVersion: () => Response,
  invalidAction: (action: string) => Response,
  unknown: (error?: unknown) => Response,
  blocked: () => Response
}
```

**Description:** Collection of predefined error response generators for common error scenarios.

**Common Error Methods:**

#### `noFrontend(structName: string)`
Returns 400 error when attempting to use a non-frontend struct in frontend operations.

#### `noStruct(structName: string)`
Returns 400 error when a required struct is not found or doesn't exist.

#### `noAccount()`
Returns 401 error when authentication is required but no account is provided.

#### `invalidBody(errors?: unknown)`
Returns 400 error for malformed request bodies or validation failures.

#### `internalError(error?: unknown)`
Returns 500 error for unexpected server-side errors.

#### `notPermitted()`
Returns 403 error when user lacks necessary permissions for the operation.

## Success Handlers

### `Success`
```ts
export const Success = {
  ok: (data?: unknown) => Response
}
```

**Description:** Collection of success response generators.

#### `ok(data?: unknown)`
Returns 200 success response with optional data payload.

**Parameters:**

| Name | Description |
|------|-------------|
| data | Optional data to include in the response |

**Returns:** JSON response with success status and data

## Usage Examples

```ts
// Error response
return Errors.noAccount();

// Success response with data
return Success.ok({ users: userList });

// Custom status response
return status(
  {
    success: false,
    code: EventErrorCode.InvalidBody,
    message: 'Username is required'
  },
  { status: 400 }
);
```

## Response Format

All responses follow this consistent structure:
```ts
{
  success: boolean;
  code: string;
  message?: string;
  data?: unknown;
  errors?: unknown;
}
```
