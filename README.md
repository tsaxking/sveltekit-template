[![Svelte Check](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml) [![Unit Tests](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml) [![Format & Lint](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml) [![e2e](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml) [![docker](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/docker-compose-test.yml) [![docs](https://github.com/tsaxking/sveltekit-template/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/gh-pages.yml)

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
    - [Services](#setup-services)
    - [Docker](#setup-docker)
  - [Development](#development)
  - [Production](#production)
- [Development Mode](#development-mode)
- [pnpm Scripts](#pnpm-scripts)
  - [Development](#development-1)
  - [Building](#building)
  - [Code Quality](#code-quality)
  - [Testing](#testing-1)
- [Build](#build)
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

We use PostgreSQL as the database and drizzle-orm as a wrapper around it.

**Supabase Support**: This template now supports Supabase! See [docs/SUPABASE_INTEGRATION.md](docs/SUPABASE_INTEGRATION.md) for details on using Supabase instead of (or alongside) a self-hosted PostgreSQL database.

#### Database Connection Options

You can configure the database connection in `config.json` using either:

1. **Individual parameters** (traditional PostgreSQL):
   ```json
   {
     "database": {
       "host": "localhost",
       "port": 5432,
       "user": "username",
       "pass": "password",
       "name": "db"
     }
   }
   ```

2. **Connection URL** (Supabase or any PostgreSQL):
   ```json
   {
     "database": {
       "connectionUrl": "postgresql://user:pass@host:port/dbname"
     }
   }
   ```

See `config.example.json` for the traditional setup or `config.supabase.example.json` for Supabase.

#### Setup (services)

```sh
# Do this any time you need to install something
# sudo is basically the system administrator, so you're executing the "apt update" command with admin priviliges
# apt is your software package installer essentially
sudo apt update

# Install 2 dependencies. You don't need the -y, if you don't put it, it'll just ask you for permission to install it.
sudo apt install postgresql postgresql-contrib -y

# Check if the postgresql is running
# "service" is basically all the different running background processes that you have access to
# Your installer, ssh, etc., are all on there
service postgresql status
# You should see a green "active (exited)" now. If not, something went wrong.

# Switch to the postgres user account and enter into postgres's CLI (command line interface)
sudo -u postgres psql

# Create an admin account
# This is good practice because if you don't, you can accidentally cause some pretty significant issues if you're not careful
CREATE ROLE admin WITH NOLOGIN;

# Now create your account
CREATE ROLE keyton WITH LOGIN;
# Add your password
ALTER ROLE keyton WITH PASSWORD "<your password here>";
# Grant admin privileges to your account
GRANT admin TO keyton;

# Create your development databases
CREATE DATABASE tators_dashboard_dev WITH OWNER keyton;
CREATE DATABASE scouting_app_dev WITH OWNER keyton;

# Leave the psl CLI
\q

# Now you need to allow your servers to connect to this locally
cd /etc/postgresql/
ls
# you'll see 1 folder here
cd ./<version>/main/
ls
# edit the postgresql.conf file using nano
sudo nano postgresql.conf
# Scroll to "CONNECTIONS AND AUTHENTICATION"
# Remove the "#" before listen_addresses
ctrl+x # exit
y # do save
enter # same file name

# restart postgres
service postgresql restart
# view its status
service postgresql status
```

#### Setup (docker)

1. Ensure Docker is installed and running ([Docker](#docker-optional))
2. Copy .env.example to .env and configure database settings
3. Start the database: pnpm db:start
4. Push initial schema: pnpm db:push

#### Commands

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
pnpm build # Generates the production code in /build
pnpm start # Runs the production code
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

## Additional Scripts

- pnpm start - Start production server
- pnpm cli - Run CLI tools
- pnpm script <script-name> - Run custom scripts from /scripts directory

## Docker (optional)

```sh
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc | cut -f1)

# Add Docker's official GPG key:
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Managing

```sh
sudo systemctl <start|stop|enable|status|restart> docker
```

### Running containers

```sh
# Run specific image
sudo docker run <image>
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes. Make sure to follow the existing code style and include tests for any new functionality.

All branches must follow this naming convention:

```
YYYY-MM-DD-<INITIALS>-ShortDescription
```

All pull requests must be linked to an issue. If there is no issue, create one before submitting the pull request.

Before any branches are merged into main, they must pass all tests and code quality checks.

## License

This software is licensed under the Polyform Noncommercial License 1.0.0.
You can use, modify, and share it for non-commercial purposes.
Commercial use requires a separate license from the author.
View [License](./license.md) for full terms and conditions

## Contact

If you have any questions, feel free to contact me via email at [taylor.reese.king@gmail.com](mailto:taylor.reese.king@gmail.com) or open an issue on GitHub.
