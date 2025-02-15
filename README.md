[![Svelte Check](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-svelte-check.yml) [![Unit Tests](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-unit.yml) [![Format & Lint](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/code-formatter.yml) [![e2e](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml/badge.svg)](https://github.com/tsaxking/sveltekit-template/actions/workflows/testing-e2e.yml)

# Sveltekit Template Initialization

## System Requirements

`node: 22.12.0`<br>
`typescript: 5.0.2`<br>
`pnpm: 10.1.0`

## Installation
```bash
# Install dependencies
pnpm i
# Set up .env file
cp .env.example .env
```

## Set up Database and Drizzle

### Database (Postgres)
[Setup Postgres](docs/postgres.md)

### Environment
```bash
# Set up .env file with the parameters you set up in the previous step
DB_HOST="my_db_host" # Default host is localhost
DB_PORT="my_db_port" # Default port is 5432
DB_NAME="my_db_name" # Database name
DB_USER="my_db_user" # The admin user you created
DB_PASS="my_db_pass" # User password
```

### Set up Drizzle
You will need to do this every time you change the schema.
```bash
# Create the migrations folder and determine the database schema
pnpm db:migrate
# Push the migrations to the database
pnpm db:push
# You will need to go through the cli process to confirm the changes
```

### Drizzle Studio

This will start the server to view the database schema and all the data stored.
Go to [https://local.drizzle.studio](https://local.drizzle.studio).
```bash
pnpm db:studio
```

See [Drizzle Docs](https://orm.drizzle.team/docs/overview) for more information.