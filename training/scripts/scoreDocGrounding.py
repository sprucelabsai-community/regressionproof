import json
from pathlib import Path

rows = [json.loads(line) for line in Path("data/eval/doc_eval.jsonl").open()]
metrics = {
    "doc_examples": len(rows),
    "doc_score": 0.0,
    "status": "pending_prediction_scoring_definition",
}

Path("reports/doc_eval_template.json").write_text(json.dumps(metrics, indent=2))
print(Path("reports/doc_eval_template.json").read_text())
