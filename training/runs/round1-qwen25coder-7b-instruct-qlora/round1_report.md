# Round 1

## Snapshot corpus root
`~/.regressionproof`

## Documentation corpus root
`/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

## Baseline and finetuned execution metrics for snapshot repair tasks
- Baseline snapshot eval: blocked by model download failure from `huggingface.co`
- Finetuned snapshot eval: blocked by `peft` and `accelerate` import incompatibility in `training/.venv310`
- Metrics artifacts:
  - `reports/baseline_snapshot_exec_metrics.json`
  - `reports/finetuned_snapshot_exec_metrics.json`

## Baseline and finetuned doc-grounding metrics for held-out documentation tasks
- Baseline doc eval: blocked by model download failure from `huggingface.co`
- Finetuned doc eval: blocked by `peft` and `accelerate` import incompatibility in `training/.venv310`
- Metrics artifacts:
  - `reports/baseline_doc_metrics.json`
  - `reports/finetuned_doc_metrics.json`

## Training stage result
- QLoRA launcher executed from `training/.venv310`
- Training artifact written to `models/round1-qwen25coder-7b-instruct-qlora/blocked.json`
- Blocker: `runtime_import_failed:ImportError`

## Summary
- `reports/round1_metrics.json` is intentionally `blocked_or_incomplete`
- Baseline blocker: `model_load_failed:OSError`
- Finetuned blocker: `runtime_import_failed:ImportError`
