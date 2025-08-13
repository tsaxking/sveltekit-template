# build-config.ts

Configuration file generator for deployment infrastructure, particularly Nginx server configuration. This script creates production-ready configuration files by prompting for environment-specific values and using templates.

## File Overview

This script automates the generation of infrastructure configuration files for deployment. It currently supports Nginx configuration generation by prompting users for domain, IP, port, and other server settings, then generates a production-ready configuration file.

## Exported Functions

### `default` (main function)
```ts
export default async () => Promise<void>
```

**Description:** Main configuration builder that orchestrates the configuration generation process.

**Process:**
1. Creates `dist/` directory if it doesn't exist
2. Calls the Nginx configuration generator
3. Outputs configuration files to the `dist/` directory

## Internal Functions

### `isAddress`
```ts
const isAddress = (d: string) => boolean
```

**Description:** Validates domain/address format using regex pattern.

### `replace`
```ts
const replace = (text: string, replacements: Record<string, string>) => string
```

**Description:** Template replacement function that substitutes `{{key}}` placeholders with values.

### `nginx`
```ts
const nginx = async () => Promise<void>
```

**Description:** Generates Nginx configuration file through interactive prompts.

**Configuration Options:**
- `domain`: Public domain name (default from `PUBLIC_DOMAIN` env var or 'example.com')
- `localIp`: Local IP address for upstream (default: 'localhost')
- `port`: Application port (default from `PORT` env var or '3000')
- `timeout`: Request timeout (default: '60s')
- `bufferSize`: Buffer size for proxying (default: '512k')
- `halfBufferSize`: Half buffer size (default: '256k')

**Process:**
1. Prompts user for each configuration value with validation
2. Uses defaults from environment variables where available
3. Loads template from `config/nginx.conf`
4. Replaces template placeholders with user-provided values
5. Writes final configuration to `dist/{domain}.conf`

**Template System:**
- Uses `{{key}}` syntax for placeholder substitution
- Validates input based on expected format (IP addresses, ports, etc.)
- Allows blank inputs to use default values

**Output:**
- Creates `dist/{domain}.conf` file ready for Nginx deployment
- Configuration includes proxy settings, buffer sizes, timeouts, and domain-specific settings

**Example Usage:**
```ts
import buildConfig from './build-config.ts';
await buildConfig(); // Prompts for config and generates Nginx conf
```
