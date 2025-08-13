# test-email.ts

Email testing utility that sends test emails to validate the email system configuration and functionality. This script provides a simple way to verify that email sending is working correctly during development and deployment.

## File Overview

This script provides email system validation by sending test emails to specified addresses. It validates email addresses and uses the application's email service to send test messages with predefined content.

## Exported Functions

### `default` (main function)
```ts
export default async (email: string) => Promise<void>
```

**Description:** Sends a test email to the specified email address for system validation.

**Parameters:**

| Name | Description |
|------|-------------|
| email | Valid email address to send the test email to |

**Validation:**
- Throws error if email parameter is not provided
- Throws error if email format is invalid (must contain '@')

**Returns:** Promise that resolves when email is sent successfully

**Example:**
```ts
import testEmail from './test-email.ts';
await testEmail('user@example.com'); // Sends test email
```

The test email includes:
- Subject: "Test Email"  
- Test link pointing to localhost:5173
- Generic test service branding
