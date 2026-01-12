#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/regressionproof}"

echo "This will remove all regressionproof containers, images, volumes, and data."
read -r -p "Type RESET to continue: " confirm

if [ "$confirm" != "RESET" ]; then
    echo "Aborted."
    exit 1
fi

if [ -d "$ROOT_DIR" ]; then
    cd "$ROOT_DIR"
fi

if docker compose version >/dev/null 2>&1; then
    docker compose down -v --remove-orphans || true
else
    docker-compose down -v --remove-orphans || true
fi

docker rm -f regressionproof-api regressionproof-gitea regressionproof-nginx 2>/dev/null || true
docker rmi regressionproof-api:local 2>/dev/null || true

rm -rf "$ROOT_DIR/gitea"

echo "Reset complete."
