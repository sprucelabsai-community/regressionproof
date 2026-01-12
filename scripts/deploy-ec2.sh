#!/usr/bin/env bash

set -euo pipefail

SCRIPT_VERSION="0.2.0"
REPO_URL="${REPO_URL:-https://github.com/sprucelabsai-community/regressionproof.git}"
ROOT_DIR="${ROOT_DIR:-$HOME/regressionproof}"
API_DOMAIN="${API_DOMAIN:-api.regressionproof.ai}"
GIT_DOMAIN="${GIT_DOMAIN:-git.regressionproof.ai}"
SSL_MODE="${SSL_MODE:-strict}"

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
version: "3.8"

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

if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi

echo "Deployment complete."
if [ "$SSL_MODE" = "strict" ]; then
    echo "API: https://${API_DOMAIN}"
    echo "Gitea: https://${GIT_DOMAIN}"
else
    echo "API: http://${API_DOMAIN}"
    echo "Gitea: http://${GIT_DOMAIN}"
fi
echo "If this is your first run, log out and back in to use Docker without sudo."
