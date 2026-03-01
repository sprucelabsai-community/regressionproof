# Odin1 Fine-Tuning Stage 2

Date: 2026-03-01
Stage: Execute fine-tuning on odin1 and capture outputs

## Host and Scope

- Host: `odin1.local`
- Repo: `/home/odin/Development/SpruceLabs/regressionproof`
- Training root: `/home/odin/Development/SpruceLabs/regressionproof/training`
- GPU: `NVIDIA GeForce RTX 4070` (`12282 MB` VRAM)

## Run Sequence

1. Attempted standard LoRA in 16-bit mode (`ROUND1_USE_QLORA=false`) with:
   - `ROUND1_MICRO_BATCH=1`
   - `ROUND1_GRAD_ACCUM=32`
   - `ROUND1_MAX_SEQ_LEN=512`
2. Standard LoRA did not fit on odin1 memory budget and failed.
3. Executed fallback QLoRA run (`ROUND1_USE_QLORA=true`) with:
   - `ROUND1_MICRO_BATCH=1`
   - `ROUND1_GRAD_ACCUM=32`
   - `ROUND1_MAX_SEQ_LEN=1024`
   - `ROUND1_TRAIN_EPOCHS=1`
4. Monitored run to completion.

## Completion Confirmation

- Final step: `200/200`
- Process: `PID 239975` exited after completion
- Primary completion log:
  - `/home/odin/Development/SpruceLabs/regressionproof/training/logs/round1-train-odin1-qlora-fallback.log`

## Artifacts Captured

- Logs copied to repo `training/logs/`
- Model artifacts copied to repo `training/models/`
  - `round1-qwen25coder-7b-instruct-qlora-fallback/`
  - `round1-qwen25coder-7b-instruct-lora-fp16/`
- Existing run/report artifacts synced from odin1 under `training/reports/` and `training/runs/`
- Training script update in `training/scripts/trainRound1.py` to support toggling between:
  - standard LoRA (`ROUND1_USE_QLORA=false`)
  - QLoRA (`ROUND1_USE_QLORA=true`)

## Notes

- All actions for this stage were executed under the repo `training/` directory.
- Regressionproof snapshot and Spruce documentation corpora remain part of the prepared dataset used by this run.
