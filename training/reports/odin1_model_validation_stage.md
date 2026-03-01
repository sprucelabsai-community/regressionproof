# Odin1 Model Validation Stage

Date (UTC): 2026-03-01
Host: `odin1`
Ollama service endpoint: `http://127.0.0.1:6006`
Tunnel endpoint: `https://storybook.expo-analytics.com`
Merged model source dir:
`/home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged`

## Step 1: Register merged model with Ollama

Registration command executed against the active service model store:

```bash
sudo OLLAMA_MODELS=/usr/share/ollama/.ollama/models \
  OLLAMA_HOST=127.0.0.1:6006 \
  ollama create regressionproof-round1-merged --experimental \
  -f /home/odin/Development/SpruceLabs/regressionproof/training/deploy/ollama/Modelfile.round1.merged
```

Result:
- `regressionproof-round1-merged:latest` manifest created under service store.
- Confirmed in `/usr/share/ollama/.ollama/models/manifests/.../regressionproof-round1-merged/latest`.

## Step 2: Confirm reachable by URL and model name

Checks performed:

```bash
curl http://127.0.0.1:6006/api/tags
curl http://127.0.0.1:6006/v1/models
curl https://storybook.expo-analytics.com/api/tags
```

Result:
- Model name is listed in all of the above responses:
  - `regressionproof-round1-merged:latest`
- URL and registry visibility checks pass.

## Step 3: Test model output for TDD principles

Inference checks performed:

```bash
curl http://127.0.0.1:6006/api/generate ... model=regressionproof-round1-merged:latest
curl http://127.0.0.1:6006/v1/chat/completions ... model=regressionproof-round1-merged:latest
```

Result:
- Inference fails at runtime, so TDD-content output could not be validated.
- Error returned by both native and OpenAI-compatible APIs:

```text
mlx runner failed: Error: unsupported architecture: Qwen2ForCausalLM (exit: exit status 1)
```

## Step 4: Confirm pluggability into VS Code and compatible coding agents

Compatibility checks:
- OpenAI-compatible discovery endpoint works:
  - `/v1/models` lists `regressionproof-round1-merged:latest`
- Native discovery endpoint works:
  - `/api/tags` lists `regressionproof-round1-merged:latest`

Limitation:
- Chat/completions calls fail with the runtime architecture error above.
- Practical pluggability for coding agents is blocked until inference runtime is fixed.

## Additional attempt: Quantized fallback registration

Attempted:

```bash
sudo OLLAMA_MODELS=/usr/share/ollama/.ollama/models \
  OLLAMA_HOST=127.0.0.1:6006 \
  ollama create regressionproof-round1-merged-q4 --experimental --quantize q4_K_M \
  -f /home/odin/Development/SpruceLabs/regressionproof/training/deploy/ollama/Modelfile.round1.merged
```

Result:
- Create path crashed with `SIGSEGV` in Ollama quantization path.
- `regressionproof-round1-merged-q4` not registered.

## Stage conclusion

- Registration and URL/name reachability: **PASS**
- TDD output validation: **BLOCKED** by Ollama runtime incompatibility
- VS Code/coding-agent pluggability: **PARTIAL** (discovery works, inference blocked)
