#!/usr/bin/env bash

# Install required packages
$ sudo apt-get install lsb-release curl gpg
# Add the Redis repository and install Redis
$ curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/$ redis-archive-keyring.gpg
# Add the repository to your sources list
$ sudo chmod 644 /usr/share/keyrings/redis-archive-keyring.gpg
# Add the Redis repository to your sources list
$ echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/$ deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Update the package list and install Redis
$ sudo apt-get update
$ sudo apt-get install redis

# Enable and start the Redis service
$ sudo systemctl enable redis-server
$ sudo systemctl start redis-server