#!/usr/bin/env bash

set -euo pipefail

SCRIPT_VERSION="0.2.11"
LAST_CHANGES=(
    "Pause for manual Gitea setup before starting API"
    "Prompt for admin credentials created in Gitea"
    "Start Gitea and Nginx before API"
    "Verify API and Gitea reachability after deploy"
    "Persist admin credentials to env file for API"
)
REPO_URL="${REPO_URL:-https://github.com/sprucelabsai-community/regressionproof.git}"
ROOT_DIR="${ROOT_DIR:-$HOME/regressionproof}"
API_DOMAIN="${API_DOMAIN:-api.regressionproof.ai}"
GIT_DOMAIN="${GIT_DOMAIN:-git.regressionproof.ai}"
SSL_MODE="${SSL_MODE:-strict}"
GITEA_ADMIN_USER="${GITEA_ADMIN_USER:-admin}"
GITEA_ADMIN_PASSWORD="${GITEA_ADMIN_PASSWORD:-}"

print_help() {
    cat <<EOF
regressionproof.ai deployment bootstrap
Version: ${SCRIPT_VERSION}

Usage: ./scripts/deploy-ec2.sh [--sslMode=flexible|strict]

Options:
  --sslMode=flexible  Use HTTP-only origin (Cloudflare Flexible SSL).
  --sslMode=strict    Use HTTPS origin + Cloudflare Origin Certs (default).
  --help              Show this help message.

Environment:
  REPO_URL   Git repo to clone (default: ${REPO_URL})
  ROOT_DIR   Target directory (default: ${ROOT_DIR})
  API_DOMAIN API domain (default: ${API_DOMAIN})
  GIT_DOMAIN Gitea domain (default: ${GIT_DOMAIN})
  SSL_MODE   SSL mode override (default: ${SSL_MODE})
  VERSION    Script version (current: ${SCRIPT_VERSION})
EOF
}

echo "=============================================="
echo "regressionproof.ai deployment bootstrap"
echo "Version: ${SCRIPT_VERSION}"
echo "Last 5 Changes:"
for change in "${LAST_CHANGES[@]}"; do
    echo "- ${change}"
done
echo "=============================================="

for arg in "$@"; do
    case "$arg" in
        --sslMode=*)
            SSL_MODE="${arg#*=}"
            ;;
        --help|-h)
            print_help
            exit 0
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Run with --help for usage."
            exit 1
            ;;
    esac
done

if [ "$SSL_MODE" != "flexible" ] && [ "$SSL_MODE" != "strict" ]; then
    echo "Invalid SSL mode: $SSL_MODE"
    echo "Use --sslMode=flexible or --sslMode=strict"
    exit 1
fi

install_packages_apt() {
    sudo apt update
    sudo apt install -y git docker.io
    sudo systemctl enable --now docker
}

install_packages_yum() {
    if command -v amazon-linux-extras >/dev/null 2>&1; then
        sudo amazon-linux-extras install -y docker
    else
        sudo yum install -y docker
    fi
    sudo yum install -y git docker-compose-plugin || true
    sudo systemctl enable --now docker
}

ensure_compose() {
    if docker compose version >/dev/null 2>&1; then
        return
    fi

    if command -v docker-compose >/dev/null 2>&1; then
        return
    fi

    sudo curl -L "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
        -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

if ! command -v docker >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
        install_packages_apt
    elif command -v yum >/dev/null 2>&1; then
        install_packages_yum
    else
        echo "Unsupported OS. Install Docker, Git, and Compose manually."
        exit 1
    fi
fi

ensure_compose

sudo usermod -aG docker "$USER" || true

if [ ! -d "$ROOT_DIR/.git" ]; then
    git clone "$REPO_URL" "$ROOT_DIR"
else
    git -C "$ROOT_DIR" pull
fi

mkdir -p "$ROOT_DIR/nginx/certs"

if [ "$SSL_MODE" = "strict" ]; then
    cat > "$ROOT_DIR/nginx/nginx.conf" <<EOF
events {}

http {
  server {
    listen 80;
    server_name ${API_DOMAIN};
    return 301 https://\$host\$request_uri;
  }

  server {
    listen 80;
    server_name ${GIT_DOMAIN};
    return 301 https://\$host\$request_uri;
  }

  server {
    listen 443 ssl;
    server_name ${API_DOMAIN};
    ssl_certificate /etc/nginx/certs/origin.pem;
    ssl_certificate_key /etc/nginx/certs/origin.key;
    location / {
      proxy_pass http://api:3000;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }

  server {
    listen 443 ssl;
    server_name ${GIT_DOMAIN};
    ssl_certificate /etc/nginx/certs/origin.pem;
    ssl_certificate_key /etc/nginx/certs/origin.key;
    location / {
      proxy_pass http://gitea:3000;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }
}
EOF
else
    cat > "$ROOT_DIR/nginx/nginx.conf" <<EOF
events {}

http {
  server {
    listen 80;
    server_name ${API_DOMAIN};
    location / {
      proxy_pass http://api:3000;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }

  server {
    listen 80;
    server_name ${GIT_DOMAIN};
    location / {
      proxy_pass http://gitea:3000;
      proxy_set_header Host \$host;
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
    }
  }
}
EOF
fi

cat > "$ROOT_DIR/docker-compose.yml" <<EOF
services:
  gitea:
    image: gitea/gitea:1.22
    container_name: regressionproof-gitea
    restart: unless-stopped
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__server__ROOT_URL=https://${GIT_DOMAIN}
      - GITEA__server__DOMAIN=${GIT_DOMAIN}
      - GITEA__server__SSH_DOMAIN=${GIT_DOMAIN}
    volumes:
      - ./gitea:/data
    networks:
      - regressionproof

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    image: regressionproof-api:local
    container_name: regressionproof-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - GITEA_URL=http://gitea:3000
      - API_PORT=3000
    env_file:
      - ./.regressionproof.env
    depends_on:
      - gitea
    networks:
      - regressionproof

  nginx:
    image: nginx:1.27
    container_name: regressionproof-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - api
      - gitea
    networks:
      - regressionproof

networks:
  regressionproof:
    driver: bridge
EOF

cd "$ROOT_DIR"

if [ "$SSL_MODE" = "strict" ]; then
    if [ ! -f "$ROOT_DIR/nginx/certs/origin.pem" ] || [ ! -f "$ROOT_DIR/nginx/certs/origin.key" ]; then
        echo "Missing Cloudflare Origin Certs."
        echo "Place certs at:"
        echo "  $ROOT_DIR/nginx/certs/origin.pem"
        echo "  $ROOT_DIR/nginx/certs/origin.key"
        exit 1
    fi
fi

run_compose_base() {
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d --build gitea nginx
    else
        docker-compose up -d --build gitea nginx
    fi
}

run_compose_api() {
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d --build api
    else
        docker-compose up -d --build api
    fi
}

if ! run_compose_base; then
    if docker ps >/dev/null 2>&1; then
        echo "Docker is running but compose failed."
        exit 1
    fi

    echo "Docker permissions not available for this user."
    echo "Attempting with sudo..."

    if docker compose version >/dev/null 2>&1; then
        sudo docker compose up -d --build gitea nginx
    else
        sudo docker-compose up -d --build gitea nginx
    fi

    echo ""
    echo "To avoid sudo next time, run:"
    echo "  sudo usermod -aG docker $USER"
    echo "  newgrp docker"
fi

echo ""
echo "Gitea setup required:"
echo "  Open: http://${GIT_DOMAIN}"
echo "  Complete the setup wizard and create the admin user."
read -r -p "Press Enter to continue once Gitea setup is complete..." _

if [ -z "$GITEA_ADMIN_PASSWORD" ]; then
    if [ -t 0 ] || [ -t 1 ]; then
        prompt_device="/dev/tty"
        if [ ! -r "$prompt_device" ]; then
            prompt_device="/dev/stdin"
        fi

        echo "Gitea admin credentials (from your setup)"
        read -r -p "Admin username [${GITEA_ADMIN_USER}]: " input_user < "$prompt_device"
        if [ -n "$input_user" ]; then
            GITEA_ADMIN_USER="$input_user"
        fi
        read -r -s -p "Admin password: " input_pass < "$prompt_device"
        echo ""
        if [ -z "$input_pass" ]; then
            echo "Admin password is required."
            exit 1
        fi
        GITEA_ADMIN_PASSWORD="$input_pass"
    else
        echo "GITEA_ADMIN_PASSWORD is required in non-interactive mode."
        exit 1
    fi
fi

cat > "$ROOT_DIR/.regressionproof.env" <<EOF
GITEA_ADMIN_USER=${GITEA_ADMIN_USER}
GITEA_ADMIN_PASSWORD=${GITEA_ADMIN_PASSWORD}
EOF

if ! run_compose_api; then
    if docker ps >/dev/null 2>&1; then
        echo "Docker is running but compose failed."
        exit 1
    fi

    echo "Docker permissions not available for this user."
    echo "Attempting with sudo..."

    if docker compose version >/dev/null 2>&1; then
        sudo docker compose up -d --build api
    else
        sudo docker-compose up -d --build api
    fi
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

echo "Deployment complete."
if [ "$SSL_MODE" = "strict" ]; then
    echo "API: https://${API_DOMAIN}"
    echo "Gitea: https://${GIT_DOMAIN}"
else
    echo "API: http://${API_DOMAIN}"
    echo "Gitea: http://${GIT_DOMAIN}"
fi
echo "Gitea admin user: ${GITEA_ADMIN_USER}"
echo "Gitea admin password: ${GITEA_ADMIN_PASSWORD}"
echo "If this is your first run, log out and back in to use Docker without sudo."
