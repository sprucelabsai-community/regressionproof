# Odin1 Model Validation Stage

Date (UTC): 2026-03-01
Host: `odin1`
Ollama service endpoint: `http://127.0.0.1:6006`
Tunnel endpoint: `https://storybook.expo-analytics.com`

## Root Cause

- Merged HF safetensors model (`Qwen2ForCausalLM`) was registered as `regressionproof-round1-merged:latest`.
- On Ubuntu/CUDA `odin1`, Ollama attempted `starting mlx runner subprocess` for that model and failed with:
  - `mlx runner failed: Error: unsupported architecture: Qwen2ForCausalLM`
- This was a model-format mismatch between the merged artifact and the available CUDA/llama runtime path.

## Resolution Applied

1. Converted merged model to GGUF on `odin1` using `llama.cpp`:

```bash
source /home/odin/Development/SpruceLabs/regressionproof/training/.venv310/bin/activate
python /home/odin/Development/SpruceLabs/regressionproof/training/tmp/llama.cpp/convert_hf_to_gguf.py \
  /home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged \
  --outtype q8_0 \
  --use-temp-file \
  --outfile /home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora-fallback/gguf/round1-merged-q8_0.gguf
```

2. Registered GGUF model in Ollama:
- `regressionproof-round1-gguf-q8:latest`
- `regressionproof-round1-gguf-q8-chatfix:latest`

3. Added deployment Modelfiles:
- `training/deploy/ollama/Modelfile.round1.gguf.q8`
- `training/deploy/ollama/Modelfile.round1.gguf.q8.chatfix`

## Validation Results

### Backend / Runner

- `journalctl -u ollama` shows `llama runner started` for GGUF model loads.
- No `mlx runner failed` for `regressionproof-round1-gguf-q8*`.

### Reachability by URL and Name

- Local model discovery:
  - `http://127.0.0.1:6006/api/tags`
  - `http://127.0.0.1:6006/v1/models`
- Tunnel model discovery:
  - `https://storybook.expo-analytics.com/v1/models`
- Model names present:
  - `regressionproof-round1-gguf-q8:latest`
  - `regressionproof-round1-gguf-q8-chatfix:latest`

### Runtime Metadata

`/api/ps` reported active model details:
- `format: gguf`
- `family: qwen2`
- `quantization_level: Q8_0`
- `size_vram: 8067160064` (~8.1 GB)

### Inference Status

- GGUF model inference works via native and OpenAI-compatible endpoints.
- `regressionproof-round1-gguf-q8-chatfix:latest` returns non-empty responses over `/v1/chat/completions`.
- Original merged safetensors model remains incompatible on this host and still fails with MLX runner.

## Stage Conclusion

- CUDA-compatible backend selection: **PASS**
- URL/name reachability: **PASS**
- Inference execution on odin1: **PASS**
- TDD-principle quality of outputs: **IN PROGRESS** (model now inferencing; prompt/content quality tuning continues)
