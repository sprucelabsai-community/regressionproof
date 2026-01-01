#!/bin/bash

# Boot a local Gitea instance for snapshot testing

CONTAINER_NAME="snapshotter-gitea"
HTTP_LISTEN_PORT=3333
SSH_SERVER_PORT=2222
BASE_URL="http://localhost:${HTTP_LISTEN_PORT}"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container '${CONTAINER_NAME}' already exists."

    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Gitea is already running at ${BASE_URL}"
    else
        echo "Starting existing container..."
        docker start "${CONTAINER_NAME}"
        echo "Gitea started at ${BASE_URL}"
    fi
else
    echo "Creating and starting Gitea container..."
    docker run -d \
        --name "${CONTAINER_NAME}" \
        -p "${HTTP_LISTEN_PORT}:3000" \
        -p "${SSH_SERVER_PORT}:22" \
        -v gitea-snapshotter-data:/data \
        gitea/gitea:latest

    echo "Gitea started at ${BASE_URL}"
    echo ""
    echo "First time setup:"
    echo "  1. Open ${BASE_URL}"
    echo "  2. Complete the installation wizard (SQLite is fine)"
    echo "  3. Create an admin user"
    echo "  4. Create a repo for snapshots"
fi
