# RCA: Step 10 OOM on Odin1 at First Training Step

Date: 2026-03-01  
Stage: Step 10 (Fine-tune with QLoRA on odin1)  
Host: `odin1.local` (`NVIDIA GeForce RTX 4070`, ~12GB VRAM)

## What Failed

Step 10 training launched successfully but failed at the first train step (`0/798`) and exited.

Observed artifact:
- `/home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora/blocked.json`
- `reason`: `training_failed:OutOfMemoryError`
- error: `torch.OutOfMemoryError: CUDA out of memory` (attempted allocation ~`1.61 GiB`)

## Root Cause

The default Step 10 hyperparameter envelope in `config/round1.env` is too large for odin1 VRAM (`MAX_SEQ_LEN=4096` with current training setup), causing OOM during the first forward/loss step.

## Contributing Factors

- Known hardware constraint on odin1 (12GB-class GPU) with Qwen 7B + long context.
- Default plan command used baseline settings instead of the proven low-VRAM fallback profile.
- Log tail alone obscured the traceback because the script writes the full exception into `blocked.json`.

## Recommended Fixes

1. Use odin1 low-VRAM fallback run profile for Step 10 retries:
- `ROUND1_USE_QLORA=true`
- `ROUND1_RUN_NAME=round1-qwen25coder-7b-instruct-qlora-fallback`
- `ROUND1_MAX_SEQ_LEN=1024`
- `ROUND1_MICRO_BATCH=1`
- `ROUND1_GRAD_ACCUM=32`
- `ROUND1_TRAIN_EPOCHS=1`

2. Keep corrected accelerate invocation:
- `--num_processes 1`

3. Add allocator mitigation:
- `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`

## Cumulative RCA Learnings Applied

From `2026-03-01-tdd-output-contamination-and-truncation.md`:
- Preserve RCA-first process before retries.

From `2026-03-01-accelerate-num-processes-validation-failure.md`:
- Ensure Step 10 launch command includes required accelerate arguments.

From this RCA:
- For odin1, apply low-VRAM fallback profile by default when Step 10 defaults OOM.

## Verification Plan

- Relaunch Step 10 on odin1 using low-VRAM fallback profile and `--num_processes 1`.
- Monitor for progress beyond first step and complete expected fallback run to final checkpoint.
