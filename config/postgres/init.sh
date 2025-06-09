#!/usr/bin/env bash

# Exit immediately on error
set -e

USER="$1"
DB="$2"

if [ -z "$USER" ] || [ -z "$DB" ]; then
  echo "Usage: ./postgres-init.sh <username> <database>"
  exit 1
fi

echo -n "Enter password for PostgreSQL user '$USER': "
read -s PASSWORD
echo

echo "Updating apt and installing PostgreSQL..."
sudo apt update
sudo apt install postgresql postgresql-contrib -y

echo "Creating PostgreSQL roles and database..."
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
      CREATE ROLE admin WITH NOLOGIN;
   END IF;
END
\$\$;

DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$USER') THEN
      CREATE ROLE $USER WITH LOGIN PASSWORD '$PASSWORD';
   ELSE
      ALTER ROLE $USER WITH PASSWORD '$PASSWORD';
   END IF;
END
\$\$;

GRANT admin TO $USER;

-- Create database if it doesn't exist
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB') THEN
      CREATE DATABASE $DB OWNER $USER;
   END IF;
END
\$\$;
EOF

# Detect PostgreSQL version automatically
PG_VERSION=$(ls /etc/postgresql)
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"

echo "Updating listen_addresses in postgresql.conf..."
sudo sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

echo "Restarting PostgreSQL..."
sudo service postgresql restart