# RCA: Step 16 TDD Validation Retry 1 Failed (chatfix model on odin1)

Date: 2026-03-01  
Stage: Step 16 TDD validation retry 1  
Host: `odin1.local`  
Model: `regressionproof-round1-gguf-q8-chatfix:latest`

## What Failed

Retry validation with stricter prompts and deterministic settings still failed the TDD three-law gate.

Probe configuration:
- endpoint: `http://127.0.0.1:6006/api/chat`
- `temperature=0`
- `num_predict=120`
- strict prompts for `law1`, `law2`, `law3`, and full `Red/Green/Refactor`

Observed results:
- all scenarios returned `done_reason: "length"`.
- outputs were still contaminated with unrelated error logs, path traces, and snapshot-like telemetry fragments.
- no scenario produced a clean, law-compliant minimal TDD response.

## Root Cause

Serving-time constraints alone are insufficient for this model variant. The `chatfix` deployment continues to emit contaminated completion patterns and truncates before producing coherent law-compliant TDD output.

## Contributing Factors

- Persistent contamination learned from trajectory-style artifacts in training targets.
- Chat template/output formatting in current `chatfix` serving path is still not robust enough to constrain response shape.
- `num_predict=120` remains insufficient when responses drift into noisy telemetry-style continuations.

## Recommended Fixes

1. Add an immediate validation branch in Step 16:
- run the same frozen TDD probe suite against both:
  - `regressionproof-round1-gguf-q8-chatfix:latest`
  - `regressionproof-round1-gguf-q8:latest`
- select only the variant that passes contamination/truncation and three-law rubric gates.

2. Tighten generation budget for validation probes:
- reduce `num_predict` further (e.g., 64 or 80)
- keep deterministic decoding (`temperature=0`).

3. If both variants fail, block release and require dataset/finetune remediation before another validation retry.

4. Persist raw probe responses in `training/reports/` for each attempt to support reproducible RCA analysis.
