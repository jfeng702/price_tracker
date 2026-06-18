#!/bin/sh
# Reliable deploy on small VMs where BuildKit often times out.
set -e
cd "$(dirname "$0")/.."

echo "Building image (legacy builder, no bake)..."
COMPOSE_BAKE=false DOCKER_BUILDKIT=0 docker build -t price-tracker-app:latest .

echo "Starting stack..."
docker compose -f docker-compose.ext.yml --env-file .env up -d

echo "Done."
docker compose -f docker-compose.ext.yml ps
