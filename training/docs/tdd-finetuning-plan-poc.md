# Spruce TDD Training POC Plan

## Scope

- Work only inside `training/` in this repo.
- Build and validate a fine-tuned coding model that follows the Three Laws of TDD.
- Use Ubuntu + CUDA for model-heavy stages (no MPS/Apple Silicon target).
- Serve on `odin1` through Ollama for low-cost operation.

## Required Data Sources

- Regressionproof snapshots: `~/.regressionproof`
- Spruce documentation: `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

Both sources are mandatory in dataset construction and evaluation.

## Stage Workflow Rules

1. Complete one stage at a time.
2. Commit at the end of each successful stage before moving to the next stage.
3. If validation fails:
   - Create a new RCA in `training/rca/` first.
   - Review all existing RCA files in `training/rca/`.
   - Update this plan only after RCA review.
   - Retry with RCA-informed changes.

RCA filename format:
- `YYYY-MM-DD-short-description.md`

RCA template sections:
- What failed
- Root cause
- Contributing factors
- Recommended fixes

## Stage 0: Environment + Repo Baseline

Objective:
- Confirm local repo and `training/` structure are in place.
- Confirm `odin1` is reachable for CUDA execution.

Artifacts:
- `training/reports/stage0_environment_baseline.md`

Validation:
- `training/` directories exist (`config`, `data`, `scripts`, `rca`, `reports`, `deploy`, `models`, `runs`, `logs`).
- `ssh odin@odin1.local` succeeds.

## Stage 1: Source Inventory (Snapshots + Docs)

Objective:
- Inventory snapshot projects from `~/.regressionproof`.
- Inventory Spruce documentation markdown from the docs root.

Inputs:
- `~/.regressionproof`
- `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

Primary scripts:
- `training/scripts/inventorySnapshots.py`
- `training/scripts/inventoryDocs.py`

Outputs:
- `training/data/raw/snapshot_projects.json`
- `training/data/raw/docs_inventory.json`
- `training/reports/stage1_data_inventory.md`

Validation:
- Snapshot inventory contains at least one git-backed mirror.
- Docs inventory contains markdown files from Spruce docs root.

## Stage 2: Dataset Build + Hygiene

Objective:
- Extract and merge:
  - `micro_step_repair`
  - `snapshot_repair`
  - `doc_grounding`
- Enforce hygiene to avoid telemetry/diff contamination in TDD outputs.

Primary scripts:
- `training/scripts/extractMicroStepExamples.py`
- `training/scripts/extractSnapshotExamples.py`
- `training/scripts/extractDocExamples.py`
- `training/scripts/buildRound1Dataset.py`
- `training/scripts/splitRound1Dataset.py`

Outputs:
- `training/data/staging/*.ndjson`
- `training/data/normalized/round1.sft.jsonl`
- `training/data/splits/train.jsonl`
- `training/data/splits/val.jsonl`
- `training/data/splits/test.jsonl`
- `training/reports/stage2_dataset_report.md`

Validation:
- Dataset includes snapshot-derived rows with `snapshotRoot` traceability.
- Dataset includes doc-grounded rows with `docsRoot`/`sourcePath` traceability.
- Contamination patterns are filtered/flagged before training.

## Stage 3: Frozen Evaluation Set Build

Objective:
- Build fixed evaluation sets for reproducible baseline and finetuned comparisons.

Primary scripts:
- `training/scripts/buildEvalSet.py`

Outputs:
- `training/data/eval/micro_step_eval.jsonl`
- `training/data/eval/snapshot_eval.jsonl`
- `training/data/eval/doc_eval.jsonl`
- `training/reports/stage3_evalset_report.md`

Validation:
- Snapshot eval rows are sourced from regressionproof snapshots.
- Doc eval rows are sourced from Spruce documentation.

## Stage 4: Baseline Evaluation on odin1 (Ubuntu/CUDA)

Objective:
- Establish pre-finetune performance and behavior baseline.

Primary scripts:
- `training/scripts/checkCudaEnvironment.py`
- `training/scripts/runBaseline.py`

Outputs:
- `training/reports/baseline_snapshot_predictions.jsonl`
- `training/reports/baseline_doc_predictions.jsonl`
- `training/reports/baseline_snapshot_exec_metrics.json`
- `training/reports/baseline_doc_metrics.json`
- `training/reports/stage4_baseline_report.md`

Validation:
- Run completes on odin1 without process-level failure.
- Baseline metrics are persisted for stage-to-stage comparison.

## Stage 5: Fine-Tune on odin1 (Ubuntu/CUDA)

Objective:
- Train a TDD-focused adapter/model using QLoRA profile suitable for odin1 GPU memory.

Primary scripts/config:
- `training/config/round1.env`
- `training/config/accelerate.yaml`
- `training/scripts/trainRound1.py`

Outputs:
- `training/models/<run-name>/checkpoint-*`
- `training/models/<run-name>/final/`
- `training/reports/stage5_training_report.md`

Validation:
- Training finishes with saved final adapter artifacts.
- No unsupported backend target (must be CUDA path).

## Stage 6: Post-Train Validation + Quality Gate

Objective:
- Compare finetuned vs baseline performance on snapshot and doc tasks.
- Enforce explicit TDD quality gate (three laws, contamination, truncation, non-empty actionable output).

Primary scripts:
- `training/scripts/runFinetunedEval.py`
- `training/scripts/runSnapshotEval.py`
- `training/scripts/scoreDocGrounding.py`
- `training/scripts/scoreRound1.py`

Outputs:
- `training/reports/finetuned_snapshot_predictions.jsonl`
- `training/reports/finetuned_doc_predictions.jsonl`
- `training/reports/finetuned_snapshot_exec_metrics.json`
- `training/reports/finetuned_doc_metrics.json`
- `training/reports/round1_metrics.json`
- `training/reports/stage6_validation_report.md`

Validation:
- Pass/fail gates recorded explicitly.
- If fail: create new RCA before any retrain/replan.

## Stage 7: Deploy to Ollama on odin1

Objective:
- Convert/prepare final model artifact for Ollama runtime and register stable served model name.

Outputs:
- `training/deploy/ollama/Modelfile.*`
- `training/reports/stage7_ollama_deploy_report.md`

Runtime target:
- Host: `odin1`
- Endpoint: existing tunnel/OpenAI-compatible path on top of odin1 service

Validation:
- Model is accessible by URL and model name.
- Inference returns non-empty TDD-focused outputs.

## Stage 8: Agent/Editor Integration Readiness

Objective:
- Confirm model can be consumed by VS Code or coding agents via OpenAI-compatible endpoint and model identifier.

Outputs:
- `training/reports/stage8_integration_report.md`

Validation:
- Documented endpoint URL, model name, and example request payload.
- Successful test calls from compatible client shape.

## Completion Criteria

- Snapshot source (`~/.regressionproof`) was used in training + evaluation.
- Spruce docs source (`/Users/taylorromero/Development/SpruceLabs/spruce-documentation`) was used in training + evaluation.
- All stages have reports under `training/reports/`.
- Stage-by-stage commit history exists.
- Final deployed model on odin1 is reachable via URL + model name.
