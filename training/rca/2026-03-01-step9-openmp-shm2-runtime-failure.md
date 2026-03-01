# RCA: Step 9 Baseline Eval Failed with OpenMP SHM2 Runtime Error

Date: 2026-03-01  
Stage: Step 9 (baseline inference/evaluation)
Host: local training workspace

## What Failed

Step 9 failed immediately when running baseline inference/eval.

- Command: `python3 scripts/runBaseline.py`
- Error:
  - `OMP: Error #179: Function Can't open SHM2 failed:`
  - `OMP: System error #2: No such file or directory`

## Root Cause

OpenMP runtime initialization failed in this execution environment while attempting to create/open SHM resources.

## Contributing Factors

- Step 9 command lacked explicit thread/runtime constraints.
- Local runtime environment differs from odin1 and has shown dependency/runtime sensitivity.

## Recommended Fixes

1. Retry Step 9 with constrained threading runtime:
- `OMP_NUM_THREADS=1`
- `MKL_NUM_THREADS=1`

2. Keep Step 9 execution inside the training directory and preserve stage commit discipline after success.

3. If the constrained retry still fails, capture a second RCA with full traceback and run Step 9 on odin1 with matching data availability constraints addressed.
