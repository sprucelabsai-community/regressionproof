# RCA: Step 16 TDD Validation Retry 2 Failed (Dual-Model Branch on odin1)

Date: 2026-03-01  
Stage: Step 16 TDD validation retry 2  
Host: `odin1.local`  
Models:
- `regressionproof-round1-gguf-q8-chatfix:latest`
- `regressionproof-round1-gguf-q8:latest`

## What Failed

Retry 2 ran the frozen TDD probe suite against both trained GGUF variants with deterministic settings and tighter token budget.

Probe settings:
- endpoint: `http://127.0.0.1:6006/api/chat`
- `temperature=0`
- `num_predict=80`
- scenarios: `law1_next_step`, `law2_minimal_test`, `law3_next_step`, `full_three_laws`

Observed:
- `chatfix` variant:
  - `truncation_count=4/4`
  - `contamination_count=4/4`
  - `law1/law2/law3 pass=0`
- non-chatfix `q8` variant:
  - `truncation_count=0/4`
  - `contamination_count=0/4`
  - `law1/law2/law3 pass=0`
  - responses were effectively empty/non-substantive despite `done_reason: stop`.

Result:
- No deployable model variant passed the TDD three-law gate.

## Root Cause

Both currently deployed model variants fail strict TDD behavior requirements for different reasons:
- chatfix variant remains contaminated/truncated.
- non-chatfix variant avoids contamination but fails to produce law-compliant actionable content under this chat validation path.

## Contributing Factors

- Persistent contamination learned in training targets for the chatfix path.
- Serving/template differences between model variants create divergent but still failing behaviors.
- Current validation harness uses `/api/chat`; non-chatfix behavior appears underconstrained/empty for these prompts.
- No explicit gate for "non-empty, executable TDD content" existed in prior scoring.

## Recommended Fixes

1. Add an explicit non-empty-content gate to Step 16 scoring:
- fail any scenario where response is blank/whitespace/non-actionable.

2. Validate non-chatfix variant through an alternate strict prompt channel if needed (e.g., adjusted template/prompt contract) and keep artifacted evidence.

3. If neither variant passes all gates (contamination, truncation, non-empty content, law1/2/3), block release and treat as model-quality failure requiring further dataset/training remediation.

4. Preserve raw retry artifacts in `training/reports/` and keep RCA-first retries.
