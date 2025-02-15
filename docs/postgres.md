# Setup Postgres

## Installation
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Check if system is working
service postgresql status
```

## Create Databases and Users
```bash
# Switch to postgres user and open psql CLI
sudo -u postgres psql

# All sql commands must end with a semicolon for them to work.
CREATE ROLE admin WITH NOLOGIN;
CREATE ROLE <your_name> WITH LOGIN;
ALTER ROLE <your_name> WITH PASSWORD '<your_password>';
GRANT admin TO <your_name>;
CREATE DATABASE <dashboard_name> WITH OWNER <your_name>;

# Exit psql CLI
\q
```

## Configuration
```bash
# Enter into the postgres config file
cd /etc/postgresql
ls # Identify postgres version number
cd <version_number>/main
ls # You should see many files and directories, one will be postgresql.conf
sudo nano postgresql.conf
ctrl+w # Search for listen_addresses
# Uncomment the line
listen_addresses = 'localhost'
ctrl+x # exit
y # save changes
enter # confirm, don't change file name

# Restart postgres
sudo service postgresql restart

# Ensure system is working
service postgresql status
```


## psql Commands
```bash
\q  # quit
\l  # list databases
\du # list users
```