[![Svelte Check](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml) [![Unit Tests](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml) [![Format & Lint](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml) [![e2e](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml) [![docker](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml)

# SvelteKit Template

A full-featured SvelteKit application template with database integration, authentication, and modern development tooling.

## Table of Contents

- [SvelteKit Template](#sveltekit-template)
- [Table of Contents](#table-of-contents)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
	- [Install Dependencies](#install-dependencies)
	- [Recommended vscode Extensions](#recommended-vscode-extensions)
- [Structure](#structure)
- [Usage](#usage)
	- [Set up](#set-up)
	- [Database](#database)
	- [Development](#development)
	- [Production](#production)
	- [Testing](#testing)
- [Development Mode](#development-mode)
- [pnpm Scripts](#pnpm-scripts)
	- [Development](#development-1)
	- [Building](#building)
	- [Code Quality](#code-quality)
	- [Testing](#testing-1)
- [Build](#build)
- [Database (pnpm db:)](#database-pnpm-db)
	- [Database Setup](#database-setup)
- [Additional Scripts](#additional-scripts)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Prerequisites

- Node.js >=22.12.0
- pnpm (recommended package manager)

## Installation

I developed this project on a linux system, so I cannot guarantee that it will work for other operating systems. All dependencies and installation instructions are linux exclusive. If you want to run this project on a different operating system, you will have to adapt the installation instructions accordingly. Feel free to open an issue on GitHub if you have questions or need help with the installation.

To install this project, go ahead and fork the repository or use it as a template. If you want your fork to be a part of the auto-update pipeline, submit an issue on github with the link to your fork, and I will add it to the list of forks that are updated automatically.

### Install Dependencies

These dependencies are required to run the project. Run these scripts to install them.

[Postgresql Database](https://www.postgresql.org/)

```bash
/config/postgres.sh your_username your_database_name your_password
```

[Redis system (linux)](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/)

```bash
/config/redis.sh
```

[pnpm](https://pnpm.io/installation)

```bash
npm i -g pnpm
```

This requires node v22.12.0 or higher. Go ahead and run this script and it will install nvm and the correct version of node for you. If you already have node installed, you can skip this step, but make sure you have the correct version installed.

[nvm](https://github.com/nvm-sh/nvm)

```bash
/config/nvm.sh
```

### Recommended vscode Extensions

- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
- [Svelte Intellisense](https://marketplace.visualstudio.com/items?itemName=naomike.svelte-intellisense)
- [Color My text](https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight)

## Structure

- .github/ - GitHub Actions
- .vscode/ - Vscode settings and configurations
- cli/ - Command Line Interface
- config/ - Configuration and initialization scripts
	- postgres.sh - Postgres Database setup script
	- redis.sh - Redis setup script
	- nvm.sh - Node Version Manager setup script
	- nginx.conf - Nginx reverse-proxy configuration file
	- start.sh - Start script for the project
- diagrams/ - Drawio Diagrams
- drizzle/ - Drizzle ORM configuration and migrations
- e2e/ - End to End Tests
- mjml/ - Email templates using MJML
- src/ - Source code
- static/ - Static files
- scripts/ - CLI Scripts

## Usage

### Set up

To set up the project, copy the .env.example file to .env and fill in the required environment variables.

### Database

Run the following commands to initialize the database

```bash
pnpm db:migrate
pnpm db:push
```

You can enter the database studio with the following command:

```bash
pnpm db:studio
```

### Development

To start the development server, run the following command:

```bash
pnpm dev
```

### Production

To start the production server, run the following command:

```bash
pnpm build
pnpm start
```

### Testing

To run all formatting, linting, and test scripts, run the following command:

```bash
pnpm system:check
```

This will run:

```bash
pnpm format # Prettier formatting
pnpm lint # ESLint linting
pnpm check # TypeScript type checking
pnpm test:unit # Vitest Unit tests
pnpm test:e2e # Playwright End-to-end tests
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

- pnpm dev - Start development server
- pnpm tools - Start server with Node.js inspection for debugging
- pnpm debug - Start Vite in debug mode

### Building

- pnpm build - Create production build (includes route tree generation)
- pnpm preview - Preview production build

### Code Quality

- pnpm lint - Format and lint code
- pnpm format - Format code with Prettier
- pnpm check - Run Svelte type checking
- pnpm check:watch - Run Svelte type checking in watch mode

### Testing

- pnpm test - Run all tests (schema, unit, e2e)
- pnpm test:unit - Run unit tests
- pnpm test:e2e - Run end-to-end tests
- pnpm check:system - Run complete system check (lint, check, test)

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
2. Copy .env.example to .env and configure database settings
3. Start the database: pnpm db:start
4. Push initial schema: pnpm db:push

## Additional Scripts

- pnpm start - Start production server
- pnpm cli - Run CLI tools
- pnpm script <script-name> - Run custom scripts from /scripts directory

## Contributing

## License

This software is licensed under the Polyform Noncommercial License 1.0.0.
You can use, modify, and share it for non-commercial purposes.
Commercial use requires a separate license from the author.
View [License](./license.md) for full terms and conditions

## Contact

If you have any questions, feel free to contact me via email at [taylor.reese.king@gmail.com](mailto:taylor.reese.king@gmail.com) or open an issue on GitHub.
