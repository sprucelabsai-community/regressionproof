#!/usr/bin/env bash
set -euo pipefail

RUN_NAME="${ROUND1_RUN_NAME:-round1-qwen25coder-7b-instruct-qlora}"

mkdir -p "runs/$RUN_NAME"

for path in \
  requirements.round1.txt \
  config/round1.env \
  reports/baseline_snapshot_predictions.jsonl \
  reports/baseline_doc_predictions.jsonl \
  reports/finetuned_snapshot_predictions.jsonl \
  reports/finetuned_doc_predictions.jsonl \
  reports/round1_metrics.json \
  reports/micro_step_eval_template.json \
  reports/snapshot_eval_template.json \
  logs/round1-train.log
do
  if [ -f "$path" ]; then
    cp "$path" "runs/$RUN_NAME/"
  fi
done

tar -czf "runs/$RUN_NAME.tar.gz" "runs/$RUN_NAME"
echo "packaged runs/$RUN_NAME.tar.gz"
