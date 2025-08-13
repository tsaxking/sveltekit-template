# Documentation

Hello and welcome to the documentation for this project! I am still working on it, so please be patient. If you have questions, feel free to open an issue on GitHub.

## Table of Contents

- [Documentation](#documentation)
  - [Table of Contents](#table-of-contents)
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
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

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

- `.github/` - [GitHub Actions](./.github/index.md)
- `.vscode/` - Vscode settings and configurations
- `cli/` - [Command Line Interface](./cli/index.md)
- `config/` - Configuration and initialization scripts
  - `postgres.sh` - Postgres Database setup script
  - `redis.sh` - Redis setup script
  - `nvm.sh` - Node Version Manager setup script
  - `nginx.conf` - Nginx reverse-proxy configuration file
  - `start.sh` - Start script for the project
- `diagrams/` - Drawio Diagrams
- `drizzle/` - Drizzle ORM configuration and migrations
- `docs/` - These docs you're reading right now!
- `e2e/` - [End to End Tests](./docs/index.md)
- `mjml/` - Email templates using MJML
- `src/` - [Source code](./src/index.md)
- `static/` - Static files

## Usage

### Set up

To set up the project, copy the `.env.example` file to `.env` and fill in the required environment variables.

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

## Contributing

## License

This software is licensed under the Polyform Noncommercial License 1.0.0.
You can use, modify, and share it for non-commercial purposes.
Commercial use requires a separate license from the author.
View [License](./license.md) for full terms and conditions

## Contact

If you have any questions, feel free to contact me via email at [taylor.reese.king@gmail.com](mailto:taylor.reese.king@gmail.com) or open an issue on GitHub.

This directory contains:

- [.github](.github/index.md)
- [cli](cli/index.md)
- [private](private/index.md)
- [scripts](scripts/index.md)
- [src](src/index.md)
