# RCA: Step 9 OpenMP SHM2 Failure Persisted After Constrained Retry

Date: 2026-03-01  
Stage: Step 9 (baseline inference/evaluation retry)
Host: local training workspace

## What Failed

A remediation retry of Step 9 still failed immediately.

- Retry environment:
  - `OMP_NUM_THREADS=1`
  - `MKL_NUM_THREADS=1`
- Command path: `python3 scripts/runBaseline.py`
- Observed error:
  - `OMP: Error #179: Function Can't open SHM2 failed:`
  - `OMP: System error #2: No such file or directory`

## Root Cause

The local runtime environment cannot initialize the OpenMP shared-memory path required by the baseline model-loading/inference stack; thread-count reduction alone does not resolve this host/runtime incompatibility.

## Contributing Factors

- Local host runtime constraints differ from the intended Ubuntu/CUDA execution target.
- Step 9 invokes model load/generation via `transformers` + `torch`, which inherits this OpenMP runtime behavior.
- The prior mitigation addressed concurrency but not SHM runtime capability.

## Recommended Fixes

1. Move Step 9 baseline inference/eval execution to odin1 (Ubuntu NVIDIA environment).
2. Keep stage artifacts generated and committed from the repo training directory after successful odin1 execution.
3. Preserve prior odin1 launch stability learnings for later CUDA stages (`--num_processes 1`, low-VRAM profile where applicable).
