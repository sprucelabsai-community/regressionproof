# RCA: Step 9 CUDA OOM During Baseline Inference on odin1

Date: 2026-03-01  
Stage: Step 9 (baseline inference/evaluation)  
Host: `odin1.local` (`NVIDIA GeForce RTX 4070`, ~12GB VRAM)

## What Failed

Step 9 baseline inference on odin1 exited with a CUDA out-of-memory exception before completing all eval examples.

Observed context:
- Command path: `python3 scripts/runBaseline.py`
- Log: `training/logs/step9-runBaseline.log`
- Failure: `torch.OutOfMemoryError: CUDA out of memory` (attempted allocation ~`1.02 GiB`)
- Partial artifacts at failure time:
  - `reports/baseline_snapshot_predictions.jsonl`: partial (5 lines)
  - `reports/baseline_doc_predictions.jsonl`: partial (1 line)

## Root Cause

Baseline inference settings in `scripts/runBaseline.py` exceed practical VRAM headroom on odin1 for this workload. The script loads the base model and performs generation with a large token budget (`max_new_tokens=800`) over long prompt payloads, which triggers OOM on a 12GB-class GPU.

## Contributing Factors

- Known odin1 VRAM constraints already observed in Step 10 training OOM incidents.
- Snapshot prompts are large (embedded failing tests/context), increasing activation/KV-cache pressure during generation.
- Step 9 currently has no low-VRAM inference profile (no dynamic max token cap, no fallback to CPU-only generation for baseline).
- Runtime warning indicates generation config mismatch (`temperature/top_p/top_k` ignored), suggesting non-tight generation control in current baseline script.

## Recommended Fixes

1. Add a Step 9 low-VRAM baseline inference profile in `scripts/runBaseline.py`:
- Reduce generation budget (e.g., `max_new_tokens` from `800` to a lower cap for baseline eval).
- Add env-driven controls (e.g., `ROUND1_BASELINE_MAX_NEW_TOKENS`) so odin1 can run with conservative defaults.

2. Reduce per-example memory pressure:
- Truncate/clip oversized prompts for baseline eval where appropriate.
- Keep deterministic decoding but avoid unnecessary generation length.

3. Add OOM-safe execution behavior:
- Wrap generation in `try/except torch.OutOfMemoryError` and record per-example blocked status rather than aborting whole stage.
- Optionally clear CUDA cache between examples when OOM is encountered.

4. Preserve prior odin1 stability learnings across stages:
- Keep explicit single-process launch where applicable.
- Keep allocator mitigation (`PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`) for CUDA-heavy runs.

5. Verification criteria for Step 9 retry:
- `runBaseline.py` completes all eval rows without process-level OOM.
- Output counts match eval inputs (`snapshot_eval` and `doc_eval` line counts).
- Step 9 artifacts and logs are committed at stage end before moving to Step 10.

## Cumulative Failure Pattern Notes

Across existing RCAs, the recurring pattern is environment-specific execution fragility plus odin1 memory limits:
- Local host failed with OpenMP SHM2 runtime errors for Step 9.
- odin1 is the correct execution target but requires memory-aware settings.
- Stage retries must remain RCA-first and use explicit low-resource profiles to avoid repeated failure loops.
