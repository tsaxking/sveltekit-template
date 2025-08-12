# Docker Setup Guide

This project includes Docker containers for both development and production environments.

## Quick Start

### Development Environment

1. Copy the environment file and configure it:
```bash
cp .env.example .env
# Edit .env with your database and Redis settings
```

2. Start the development environment with all services:
```bash
docker compose -f docker-compose.dev.yml up
```

This will start:
- SvelteKit app in development mode (port 5173)
- PostgreSQL database (port 5432)
- Redis server (port 6379)

### Production Environment

For production, external PostgreSQL and Redis services are assumed:

1. Configure your environment variables:
```bash
export DB_HOST=your-postgres-host
export REDIS_HOST=your-redis-host
# ... other required environment variables
```

2. Start the production container:
```bash
docker compose -f docker-compose.prod.yml up
```

## Database and Redis Only

If you want to run just the database and Redis services (useful for local development without Docker for the app):

```bash
docker compose up -d db redis
```

## Environment Variables

Key Docker-related environment variables:

- `DB_HOST`: Database host (use `db` for Docker networking)
- `REDIS_HOST`: Redis host (use `redis` for Docker networking)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_URL`: Alternative full Redis connection URL

## File Structure

- `Dockerfile`: Multi-stage Docker build for the application
- `docker-compose.yml`: Basic database and Redis services
- `docker-compose.dev.yml`: Full development environment
- `docker-compose.prod.yml`: Production deployment
- `.dockerignore`: Files to exclude from Docker builds

## Notes

- The development container includes hot-reloading
- Production container runs as a non-root user for security
- Persistent volumes are used for database and Redis data
- Networks are configured for proper service communication