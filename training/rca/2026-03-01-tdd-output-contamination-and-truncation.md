# RCA: TDD Output Contamination and Truncation

Date: 2026-03-01
Stage: Deployed model validation via tunnel endpoint
Model: `regressionproof-round1-gguf-q8-chatfix:latest`
Endpoint: `https://storybook.expo-analytics.com/v1/chat/completions`

## What Failed

Validation failed on the TDD behavior gate.

Expected:
- Responses should demonstrate strict three-law TDD sequencing (Red, Green, Refactor).
- Responses should be concise, on-task, and complete.

Observed:
- Responses were contaminated with snapshot and diff telemetry-style content (`PROJECT`, `SNAPSHOT_ROOT`, `MIRROR_STATE`, `diff --git ...`).
- Multiple responses ended with `finish_reason: "length"` and were truncated before completing a coherent TDD sequence.
- The model failed all three TDD criteria in evaluation:
  1. failing test first
  2. minimal production code to pass
  3. refactor only after passing tests

## Root Cause

Primary root cause: training/inference format misalignment that over-prioritized snapshot trajectory artifacts over instruction-following output format.

Specifically:
- The model appears to have learned to emit internal trajectory metadata/diff-like structures as a default response mode.
- Serving/template configuration allowed verbose continuation behavior that increased risk of long, noisy completions and truncation.

## Contributing Factors

- Dataset contamination risk: assistant targets likely include or over-represent raw snapshot telemetry/diff framing in contexts where the intended output should be direct TDD guidance.
- Prompt-template leakage: deployment template/system instruction did not sufficiently suppress metadata-style preambles.
- Output budget mismatch: `max_tokens` and generation behavior allowed long continuations, increasing `finish_reason: "length"` frequency.
- Validation prompt strictness arrived late: the first probes used broad instructions and exposed the contamination pattern before strict format constraints were applied.

## Recommended Fixes

1. Dataset hygiene pass (required before retrain)
- Filter or rewrite assistant targets that begin with or heavily contain telemetry/diff preambles when task type expects direct guidance output.
- Add explicit denylist pattern checks during dataset build for:
  - `PROJECT:`
  - `SNAPSHOT_ROOT:`
  - `MIRROR_PATH:`
  - `MIRROR_STATE:`
  - `diff --git`

2. Task-bound output constraints in training data
- Add stronger instruction exemplars enforcing answer-first, compact `Red/Green/Refactor` structure.
- Include negative examples or transformation rules that convert metadata-heavy traces into clean user-facing guidance.

3. Serving-time response controls
- Keep explicit Qwen stop tokens in Modelfile.
- Apply lower default output budget for validation prompts and deterministic settings (`temperature=0`).
- Prefer narrower prompts with exact format contracts during quality gates.

4. Evaluation hard gates (new)
- Track `contamination_rate`: percentage of outputs containing telemetry/diff artifact patterns.
- Track `truncation_rate`: percentage of outputs with `finish_reason: "length"`.
- Keep TDD rubric scoring as a release gate; all three laws must pass.

5. Process control
- For any future failed validation, create/update RCA first in `training/rca/` before plan edits or retraining attempts.

## Verification Plan For Fixes

- Rebuild dataset with hygiene filters enabled.
- Retrain and redeploy to `odin1` CUDA path.
- Re-run fixed TDD prompt suite via tunnel.
- Accept only if:
  - contamination rate is near zero
  - truncation rate is near zero on the validation suite
  - TDD three-law rubric passes
