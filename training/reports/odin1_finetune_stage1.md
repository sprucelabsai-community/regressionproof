# Odin1 Fine-Tuning Stage 1

Date: 2026-02-28
Objective: Configure and execute round1 fine-tuning on Ubuntu/CUDA (`odin1`).

## Remote Host

- Host: `odin1.local`
- User: `odin`
- Repo path: `~/Development/SpruceLabs/regressionproof`
- Training path: `~/Development/SpruceLabs/regressionproof/training`

## Commands Executed on odin1

```bash
cd ~/Development/SpruceLabs/regressionproof/training
python3 -m venv .venv310
source .venv310/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.round1.txt
set -a
source config/round1.env
set +a
python3 scripts/checkCudaEnvironment.py | tee logs/cuda-check-odin1.json
python3 scripts/trainRound1.py 2>&1 | tee logs/round1-train-odin1.log
```

## CUDA Preflight Result

- Status: `ok`
- CUDA available: `true`
- Device: `NVIDIA GeForce RTX 4070`
- CUDA version: `12.4`
- Torch version: `2.5.1+cu124`

## Training Outcome

- Dataset preprocessing completed.
- Model download and checkpoint load completed.
- Training run started and failed on the first training step.

Failure artifact on odin1:
- `training/models/round1-qwen25coder-7b-instruct-qlora/blocked.json`

Failure reason:
- `training_failed:OutOfMemoryError`
- `torch.OutOfMemoryError: CUDA out of memory`
- Attempted allocation: `1.61 GiB`
- GPU total: `11.60 GiB`, free at failure: `1.03 GiB`

## Notes

- This stage confirms Ubuntu/CUDA environment is correctly configured and executable.
- The current round1 hyperparameters exceed available VRAM on odin1's GPU.
- Next action should reduce memory pressure (e.g., lower `ROUND1_MAX_SEQ_LEN`, optional allocator setting) and rerun.

## Remote Run Metadata

- odin1 repo commit: `c3562cc`
- UTC timestamp captured: `2026-02-28T23:38:57Z`
