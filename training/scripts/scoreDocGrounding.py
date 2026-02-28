import json
import os
from difflib import SequenceMatcher
from pathlib import Path


mode = os.environ.get("ROUND1_EVAL_MODE", "baseline")
eval_rows = [json.loads(line) for line in Path("data/eval/doc_eval.jsonl").open()]
predictions_path = Path(f"reports/{mode}_doc_predictions.jsonl")

if not predictions_path.exists():
    metrics = {
        "status": "missing_predictions",
        "mode": mode,
        "doc_examples": len(eval_rows),
        "predictionsPath": str(predictions_path),
    }
else:
    predictions = [json.loads(line) for line in predictions_path.open()]
    if predictions and predictions[0].get("status") == "blocked":
        metrics = {
            "status": "blocked",
            "mode": mode,
            "doc_examples": len(eval_rows),
            "predictionsPath": str(predictions_path),
            "reason": predictions[0].get("reason", "unknown"),
        }
    else:
        scores = []
        for row in predictions:
            prediction = row.get("prediction", "")
            target = row.get("target", "")
            scores.append(SequenceMatcher(None, prediction, target).ratio())

        metrics = {
            "status": "scored",
            "mode": mode,
            "doc_examples": len(predictions),
            "doc_score": sum(scores) / len(scores) if scores else 0.0,
            "predictionsPath": str(predictions_path),
        }

Path(f"reports/{mode}_doc_metrics.json").write_text(json.dumps(metrics, indent=2))
print(Path(f"reports/{mode}_doc_metrics.json").read_text())
