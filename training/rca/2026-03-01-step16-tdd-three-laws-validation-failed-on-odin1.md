# RCA: Step 16 TDD Three-Laws Validation Failed on odin1

Date: 2026-03-01  
Stage: TDD validation against trained model on odin1 (`regressionproof-round1-gguf-q8-chatfix:latest`)  
Host: `odin1.local` (Ollama on port `6006`)

## What Failed

TDD validation probes against the trained model failed the three-law behavior gate.

Observed across real TDD scenarios:
- Responses did not consistently begin with a minimal failing test when asked for the next strict TDD step.
- Responses included unrelated repository/build telemetry and snapshot metadata artifacts.
- At least one probe terminated with `done_reason: "length"` and truncated output.
- Response patterns resembled contamination documented in prior RCAs (`PROJECT`, `SNAPSHOT_ROOT`, `MIRROR_PATH`, diff-fragment style output), not focused TDD guidance.

Result:
- TDD gate: **FAIL**

## Root Cause

The deployed chatfix model still exhibits output-format contamination and task-following drift under TDD prompts. The remediation to generation defaults alone did not sufficiently suppress trajectory metadata style emissions or truncation risk for validation prompts.

## Contributing Factors

- Residual training-target contamination from snapshot-style artifacts in assistant outputs.
- Prompt-template coupling to historical snapshot/diff formatting tendencies.
- Validation prompt shape still allows model to drift into repository telemetry rather than strict TDD output.
- Token budgeting remains sensitive; longer completions still risk truncation on some prompts.

## Recommended Fixes

1. Tighten Step 16 quality gate implementation to include hard, measured checks on every validation run:
- `contamination_rate`
- `truncation_rate`
- explicit per-law rubric pass/fail (`law1`, `law2`, `law3`)

2. Expand dataset hygiene in `buildRound1Dataset.py`:
- strip/deny telemetry-style assistant targets (`PROJECT:`, `SNAPSHOT_ROOT:`, `MIRROR_PATH:`, `MIRROR_STATE:`, `diff --git`) for TDD-guidance tasks.

3. Strengthen serving behavior for validation probes:
- enforce concise output constraints (`num_predict` cap)
- deterministic settings (`temperature=0`)
- strict template/system contract requiring direct TDD answer format only.

4. Add a frozen TDD validation prompt set and report artifact under `training/reports/` for reproducible regression checks.

5. Continue RCA-first discipline before any further retraining or validation retries.
