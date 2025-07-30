#!/bin/bash

set -e

while IFS='=' read -r key value; do
  # skip empty lines or lines starting with #
  if [[ -z "$key" ]] || [[ "$key" =~ ^# ]]; then
    continue
  fi

  # skip lines where key or value is empty or malformed
  if [[ -z "$value" ]]; then
    continue
  fi

  # remove possible quotes around value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')

  export "$key=$value"
done < .docker.env

TEMPLATE_DIR="./config/postgres"
envsubst < "$TEMPLATE_DIR/init.sql.template" > "$TEMPLATE_DIR/init.sql"

echo "Generated init.sql from template"
