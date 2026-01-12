#!/usr/bin/env bash

set -euo pipefail

SCRIPT_VERSION="0.1.1"
LAST_CHANGES=(
    "Pull latest code in the repo root"
    "Rebuild API and nginx only"
    "Show container status table"
    "Run service checks via nginx"
)
ROOT_DIR="${ROOT_DIR:-$HOME/regressionproof}"
API_DOMAIN="${API_DOMAIN:-api.regressionproof.ai}"
GIT_DOMAIN="${GIT_DOMAIN:-git.regressionproof.ai}"

echo "=============================================="
echo "regressionproof.ai update"
echo "Version: ${SCRIPT_VERSION}"
echo "Last 2 Changes:"
for change in "${LAST_CHANGES[@]}"; do
    echo "- ${change}"
done
echo "=============================================="

if [ ! -d "$ROOT_DIR/.git" ]; then
    echo "Missing repo at $ROOT_DIR. Run deploy-ec2.sh first."
    exit 1
fi

git -C "$ROOT_DIR" pull

cd "$ROOT_DIR"

if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build api nginx
else
    docker-compose up -d --build api nginx
fi

echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

check_service() {
    local name="$1"
    local url="$2"
    local code

    if ! docker ps --format '{{.Names}}' | grep -q "^regressionproof-nginx$"; then
        echo "${name}: SKIP (nginx not running)"
        return
    fi

    code="$(docker exec regressionproof-nginx curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    case "$code" in
        200|301|302|405)
            echo "${name}: OK (${code})"
            ;;
        *)
            echo "${name}: FAIL (${code})"
            ;;
    esac
}

echo ""
echo "Service checks:"
check_service "Gitea" "http://gitea:3000"
check_service "API" "http://api:3000/check-name/test"

echo ""
echo "Update complete."
echo "API: http://${API_DOMAIN}"
echo "Gitea: http://${GIT_DOMAIN}"
