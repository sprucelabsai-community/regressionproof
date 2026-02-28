# Dataset Preparation Report

Date: 2026-02-28
Stage: Collect and prepare training data

## Source Inputs

- Regressionproof snapshots root: `~/.regressionproof`
- Spruce documentation root: `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

## Discovery Summary

- Snapshot projects discovered: 10
- Snapshot git mirrors discovered: 9
- Total snapshot commits discovered: 8451
- Spruce markdown documents discovered: 96

## Dataset Build Pipeline Used

The existing training pipeline in this repository was used without schema changes:

1. `python3 scripts/inventorySnapshots.py`
2. `python3 scripts/inventoryDocs.py`
3. `python3 scripts/extractMicroStepExamples.py`
4. `python3 scripts/extractSnapshotExamples.py`
5. `python3 scripts/extractDocExamples.py`
6. `python3 scripts/buildRound1Dataset.py`
7. `python3 scripts/splitRound1Dataset.py`
8. `python3 scripts/buildEvalSet.py`

## Generated Artifacts

- `training/data/raw/snapshot_projects.json`
- `training/data/raw/docs_inventory.json`
- `training/data/staging/micro_step_examples.ndjson`
- `training/data/staging/snapshot_examples.ndjson`
- `training/data/staging/doc_examples.ndjson`
- `training/data/normalized/round1.sft.jsonl`
- `training/data/splits/train.jsonl`
- `training/data/splits/val.jsonl`
- `training/data/splits/test.jsonl`
- `training/data/eval/micro_step_eval.jsonl`
- `training/data/eval/snapshot_eval.jsonl`
- `training/data/eval/doc_eval.jsonl`

## Artifact Record Counts (lines)

- `data/raw/snapshot_projects.json`: 101
- `data/raw/docs_inventory.json`: 481
- `data/staging/micro_step_examples.ndjson`: 8442
- `data/staging/snapshot_examples.ndjson`: 3723
- `data/staging/doc_examples.ndjson`: 185
- `data/normalized/round1.sft.jsonl`: 12350
- `data/splits/train.jsonl`: 6375
- `data/splits/val.jsonl`: 110
- `data/splits/test.jsonl`: 5865
- `data/eval/micro_step_eval.jsonl`: 50
- `data/eval/snapshot_eval.jsonl`: 50
- `data/eval/doc_eval.jsonl`: 23

## Notes

- This stage was executed fully within the repo `training/` directory.
- The fine-tuning dataset format includes both regressionproof snapshot-derived examples and Spruce documentation-grounded examples.
