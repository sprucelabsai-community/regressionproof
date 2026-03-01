# RCA: Step 9 Baseline Throughput Too Slow at 256 Tokens on odin1

Date: 2026-03-01  
Stage: Step 9 (baseline inference/evaluation retry)
Host: `odin1.local`

## What Failed

A Step 9 retry used updated low-VRAM settings with `ROUND1_BASELINE_MAX_NEW_TOKENS=256`, but runtime throughput was too slow to be operationally viable for the baseline stage.

Observed behavior:
- `python3 scripts/runBaseline.py` remained active for an extended period with high CPU/GPU usage.
- Progress visibility was poor mid-run because output file writes were buffered.
- The stage was manually interrupted and reconfigured before completion.

## Root Cause

The token budget (`256`) combined with large prompt payloads and constrained odin1 memory envelope (model offload behavior) produced very low per-example generation throughput for Step 9 baseline inference.

## Contributing Factors

- Snapshot eval prompts are large (failing tests + context), increasing decode cost.
- 12GB-class GPU constraints force memory-sensitive execution and partial offload behavior.
- Step 9 lacked an explicit throughput guardrail (max acceptable per-example latency) in the plan.
- Mid-run progress was harder to interpret because writes were buffered until flush/close.

## Recommended Fixes

1. Use a tighter odin1 baseline token cap for Step 9 retries:
- `ROUND1_BASELINE_MAX_NEW_TOKENS=64` (or lower if needed)

2. Keep memory-stability settings during Step 9:
- `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`
- `OMP_NUM_THREADS=1`
- `MKL_NUM_THREADS=1`

3. Add a Step 9 throughput control to plan and execution defaults:
- Define a practical token cap and allow env override.
- Prefer concise deterministic outputs for baseline quality checks.

4. Improve progress observability during long runs:
- Run with `PYTHONUNBUFFERED=1` and/or add periodic progress logging in `runBaseline.py`.

5. Preserve process discipline:
- If Step 9 retry strategy changes after a failed/blocked attempt, write RCA first, then update plan, then retry.
