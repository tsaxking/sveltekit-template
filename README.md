[![Svelte Check](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml) [![Unit Tests](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml) [![Format & Lint](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml) [![e2e](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml) [![docker](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml)

# SvelteKit Template

A full-featured SvelteKit application template with database integration, authentication, and modern development tooling.

## Prerequisites

- Node.js >=22.12.0
- pnpm (recommended package manager)

## Installation

```bash
# Install dependencies
pnpm install
```

## Development Mode

Start the development server:

```bash
# Start development server
pnpm dev

# Start with debugging
pnpm debug

# Start server with inspection for debugging
pnpm tools
```

## pnpm Scripts

This project uses pnpm as the package manager. Key commands include:

### Development
- `pnpm dev` - Start development server
- `pnpm tools` - Start server with Node.js inspection for debugging
- `pnpm debug` - Start Vite in debug mode

### Building
- `pnpm build` - Create production build (includes route tree generation)
- `pnpm preview` - Preview production build

### Code Quality
- `pnpm lint` - Format and lint code
- `pnpm format` - Format code with Prettier
- `pnpm check` - Run Svelte type checking
- `pnpm check:watch` - Run Svelte type checking in watch mode

### Testing
- `pnpm test` - Run all tests (schema, unit, e2e)
- `pnpm test:unit` - Run unit tests
- `pnpm test:e2e` - Run end-to-end tests
- `pnpm check:system` - Run complete system check (lint, check, test)

## Build

To create a production version of your app:

```bash
pnpm build
```

The build process includes:
1. Route tree generation
2. Vite production build
3. SvelteKit adapter compilation

Preview the production build:

```bash
pnpm preview
```

## Database (pnpm db:)

This project includes database integration with Drizzle ORM. Available database commands:

```bash
# Start database with Docker Compose
pnpm db:start

# Push schema changes to database
pnpm db:push

# Run database migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Database Setup
1. Ensure Docker is installed and running
2. Copy `.env.example` to `.env` and configure database settings
3. Start the database: `pnpm db:start`
4. Push initial schema: `pnpm db:push`

## Additional Scripts

- `pnpm start` - Start production server
- `pnpm cli` - Run CLI tools
- `pnpm script <script-name>` - Run custom scripts from `/scripts` directory
