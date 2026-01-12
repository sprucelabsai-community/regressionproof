# Deployment (EC2 + Docker Compose)

This guide deploys the API and Gitea on a single EC2 instance, exposed via
`api.regressionproof.ai` and `git.regressionproof.ai`.

## Checklist

### 1) DNS (Cloudflare)
- Create `api` and `git` records pointing to the EC2 public IP.
- Proxy status: **Proxied** (orange cloud).
- SSL/TLS: **Full** (or **Full (strict)** if you install an origin cert).

### 2) EC2 Instance
- Ubuntu 22.04 LTS
- Security group inbound:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)

### 3) Install Docker
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
```
Log out and back in to refresh group permissions.

### 4) Directory Layout
```bash
mkdir -p ~/regressionproof/{api,gitea,nginx}
```

### 5) Docker Compose
Create `~/regressionproof/docker-compose.yml`:

```yaml
version: "3.8"

services:
  gitea:
    image: gitea/gitea:1.22
    container_name: regressionproof-gitea
    restart: unless-stopped
    environment:
      - USER_UID=1000
      - USER_GID=1000
      - GITEA__server__ROOT_URL=https://git.regressionproof.ai
      - GITEA__server__DOMAIN=git.regressionproof.ai
      - GITEA__server__SSH_DOMAIN=git.regressionproof.ai
    volumes:
      - ./gitea:/data
    networks:
      - regressionproof

  api:
    image: ghcr.io/sprucelabsai-community/regressionproof-api:latest
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
```

### 6) Nginx Config
Create `~/regressionproof/nginx/nginx.conf`:

```nginx
events {}

http {
  server {
    listen 80;
    server_name api.regressionproof.ai;
    location / {
      proxy_pass http://api:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }

  server {
    listen 80;
    server_name git.regressionproof.ai;
    location / {
      proxy_pass http://gitea:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

If you want HTTPS at the origin, place certs in `~/regressionproof/nginx/certs`
and expand the Nginx config accordingly.

### 7) Launch
```bash
cd ~/regressionproof
docker-compose up -d
```

### 8) Gitea Setup
- Visit `https://git.regressionproof.ai`.
- Complete the admin setup wizard.

### 9) Verify API
```bash
curl https://api.regressionproof.ai/check-name/test
```

## Notes
- The API talks to Gitea over Docker networking (`http://gitea:3000`).
- Keep `~/regressionproof/gitea` backed up; it contains repos and config.
