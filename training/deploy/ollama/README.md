# odin1 Ollama Deployment (Port 6006)

This deployment targets the existing cloudflared route:

- `storybook.expo-analytics.com -> http://localhost:6006`

## Verified on odin1

- Ollama installed: `0.17.4`
- Systemd service active
- Listener moved to `0.0.0.0:6006`
- Local API reachable: `http://127.0.0.1:6006/api/tags`
- Base model endpoint created: `regressionproof-base-smoke`

## Commands used

```bash
# Stop conflicting process on 6006 and bind Ollama to 6006
sudo kill 48999
sudo mkdir -p /etc/systemd/system/ollama.service.d
cat >/tmp/ollama-override.conf <<'CONF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:6006"
Environment="OLLAMA_ORIGINS=*"
CONF
sudo cp /tmp/ollama-override.conf /etc/systemd/system/ollama.service.d/override.conf
sudo systemctl daemon-reload
sudo systemctl restart ollama

# Pull base model and create named endpoint
OLLAMA_HOST=127.0.0.1:6006 ollama pull qwen2.5-coder:7b-instruct
OLLAMA_HOST=127.0.0.1:6006 ollama create regressionproof-base-smoke -f Modelfile.base
```

## Fine-tuned adapter status

Attempted to deploy adapter artifacts from:

- `/home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora-fallback/final`

Observed blocker on Ollama `0.17.4` during `ADAPTER` ingestion:

- `Error: open adapter_config.json: no such file or directory`
- Alternate forms (`ADAPTER <dir>`, `--experimental`) failed to load correctly on this host.

### Next viable path

1. Merge LoRA adapter into full HF safetensors model directory.
2. Import merged directory with Ollama experimental mode.
3. Create endpoint `regressionproof-round1` once import succeeds.

## Local verification endpoint

```bash
curl http://127.0.0.1:6006/api/tags
```
