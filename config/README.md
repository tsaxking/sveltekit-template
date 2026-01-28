## config

Configuration assets used by local dev, containers, and production deployments.

### Files

- config.example.json: sample app configuration (copy to config.json).
- config.json: local configuration overrides (not committed).
- config.schema.json: JSON schema for config validation.
- nginx.conf: reverse proxy template for container deployments.
- nvm.sh: Node version helper for shell-based setups.
- postgres.sh: Postgres bootstrap script for containers.
- redis.sh: Redis bootstrap script for containers.
- start.sh: container entrypoint and startup helper.

### Setup

1. Copy the example config:
   - config.example.json → config.json
2. Adjust values for your environment (ports, database, redis, etc.).
3. If you want validation, use config.schema.json in your editor or tooling.

### Notes

- config.json is environment-specific. Avoid committing secrets.
- Docker files and scripts read from config.json and environment variables.
