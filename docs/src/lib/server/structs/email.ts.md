# email.ts

Email sending and link tracking system for the application. This module provides email functionality using SendGrid transport, template rendering, and email link tracking capabilities.

## File Overview

This file implements email functionality including template-based email sending, email link creation and tracking, and integration with SendGrid for email delivery. Note that email functionality is currently deprecated in this implementation but the infrastructure remains for future use.

## Core Structure

### `Email.Links`
```ts
export const Links = new Struct({
  name: 'email_links',
  structure: {
    link: text('link').notNull(),
    opened: boolean('opened').notNull(),
    expires: text('expires').notNull()
  },
  validators: {
    expires: (val) => typeof val === 'string' && (val === 'never' || new Date(val).toString() !== 'Invalid Date')
  }
})
```

**Description:** Structure for tracking email links including expiration and open status.

**Fields:**
- `link`: The target URL for the email link
- `opened`: Boolean flag indicating if the link has been clicked
- `expires`: Expiration date as ISO string or 'never' for no expiration

## Email Functions

### `createLink`
```ts
export const createLink = (link: string, expires?: Date) => Promise<string>
```

**Description:** Creates a trackable email link with optional expiration. Currently deprecated.

**Parameters:**

| Name | Description |
|------|-------------|
| link | Target URL for the email link |
| expires | Optional expiration date for the link |

**Returns:** Promise resolving to the trackable email link URL

**Status:** Currently throws error as email functionality is deprecated

### `send`
```ts
export const send = <T extends keyof E>(config: {
  type: T;
  data: E[T];
  to: string | string[];
  subject: string;
  attachments?: { filename: string; path: string }[];
}) => Promise<void>
```

**Description:** Sends templated email using SendGrid transport. Currently deprecated.

**Parameters:**

| Name | Description |
|------|-------------|
| config.type | Email template type (must match available email templates) |
| config.data | Template data matching the specified email type |
| config.to | Recipient email address(es) |
| config.subject | Email subject line |
| config.attachments | Optional file attachments with filename and path |

**Returns:** Promise that resolves when email is sent

**Status:** Currently throws error as email functionality is deprecated

**Template Process:**
1. Loads HTML template from `private/emails/{type}.html`
2. Renders template with provided data using html-constructor
3. Sends email via SendGrid with rendered HTML content

## Configuration

The email system uses the following environment variables (when active):
- `SENDGRID_API_KEY`: SendGrid API key for authentication
- `SENDGRID_EMAIL`: From email address
- `PUBLIC_DOMAIN`: Domain for generating email links
- `HTTPS`: Protocol for email links (true/false)
- `PORT`: Port number for localhost links

## Dependencies

- **nodemailer**: Email sending library
- **@neoxia-js/nodemailer-sendgrid-transport**: SendGrid transport for nodemailer
- **html-constructor**: Template rendering for email content

## Email Templates

Email templates are stored in `private/emails/` directory as HTML files. Template names correspond to the `type` parameter in the `send` function. Templates use html-constructor syntax for data interpolation.

## Migration Notes

This module shows email functionality that has been deprecated. When reactivating:
1. Uncomment transporter configuration
2. Uncomment email sending logic in `send` function
3. Uncomment link creation logic in `createLink` function
4. Ensure environment variables are properly set
5. Verify email templates exist in `private/emails/` directory
