#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root (sudo)."
  exit 1
fi

mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<'CONF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:6006"
Environment="OLLAMA_ORIGINS=*"
CONF

systemctl daemon-reload
systemctl restart ollama
systemctl --no-pager status ollama | sed -n '1,12p'
ss -ltnp | grep ':6006' || true
