#!/usr/bin/env bash

nvm i v22.12.0
nvm use v22.12.0

node --env-file=../.env ../src/server.js