# RCA: Accelerate Launch Validation Failure (`--num_processes` Required)

Date: 2026-03-01  
Stage: Step 10 (CUDA QLoRA training launch on odin1)  
Environment: `odin1` Ubuntu + NVIDIA CUDA (`NVIDIA GeForce RTX 4070`)

## What Failed

Training did not start. The launch command failed during `accelerate` argument/config validation.

Observed error:
- `ValueError: You need to manually pass in --num_processes using this config yaml.`

Expected:
- `scripts/trainRound1.py` should start via `accelerate launch` and begin QLoRA training on odin1.

## Root Cause

The Step 10 launch command in the plan omitted `--num_processes`, but the current `config/accelerate.yaml` on odin1 requires it explicitly.

## Contributing Factors

- Launch contract mismatch between documented command and active accelerate config behavior.
- No preflight launch validation step that checks argument completeness before long-running training.
- Previous RCA findings focus on output-quality validation; this failure is an orchestration/config validation gap earlier in the pipeline.

## Recommended Fixes

1. Update the Step 10 command in `training/docs/plan.md`:
- Use `accelerate launch --num_processes 1 --config_file config/accelerate.yaml scripts/trainRound1.py`.

2. Preserve single-GPU intent explicitly:
- Keep `--num_processes 1` as the default for odin1 unless hardware topology changes.

3. Add a launch preflight habit before retries:
- Run CUDA check first (already required).
- Fail fast on launch argument validation and record RCA before retry.

## Cumulative RCA Learnings Applied

From `2026-03-01-tdd-output-contamination-and-truncation.md`:
- Maintain RCA-first process discipline before retries after failures.
- Keep explicit quality gates in the plan.

From this RCA:
- Tighten Step 10 execution contract so training reliably starts on odin1.

## Verification Plan

- Re-run Step 10 on odin1 using:
  - `accelerate launch --num_processes 1 --config_file config/accelerate.yaml scripts/trainRound1.py`
- Confirm:
  - process starts,
  - training log advances over time,
  - checkpoints/final adapter artifacts are produced.
