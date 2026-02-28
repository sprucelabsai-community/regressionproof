import json
from pathlib import Path
import os


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2))


def load_predictions(mode: str):
    path = Path(f"reports/{mode}_snapshot_predictions.jsonl")
    if not path.exists():
        return path, []
    return path, [json.loads(line) for line in path.open()]


def build_template():
    results = []
    for line in Path("data/eval/snapshot_eval.jsonl").open():
        row = json.loads(line)
        results.append(
            {
                "project": row["project"],
                "mirrorPath": row["mirrorPath"],
                "failingCommit": row["messages"][1]["content"],
                "status": "pending_manual_runner_definition",
            }
        )

    write_json(Path("reports/snapshot_eval_template.json"), results)
    return results


mode = os.environ.get("ROUND1_EVAL_MODE", "baseline")
predictions_path, predictions = load_predictions(mode)
template = build_template()

if not predictions:
    metrics = {
        "status": "missing_predictions",
        "mode": mode,
        "predictionsPath": str(predictions_path),
        "evalExamples": len(template),
    }
elif predictions[0].get("status") == "blocked":
    metrics = {
        "status": "blocked",
        "mode": mode,
        "reason": predictions[0].get("reason", "unknown"),
        "predictionsPath": str(predictions_path),
        "evalExamples": len(template),
    }
else:
    metrics = {
        "status": "pending_manual_runner_definition",
        "mode": mode,
        "predictionsPath": str(predictions_path),
        "evalExamples": len(template),
        "requiredMetrics": [
            "fail_to_pass",
            "pass_to_pass",
            "failed_test_delta",
            "exit_status",
        ],
    }

write_json(Path(f"reports/{mode}_snapshot_exec_metrics.json"), metrics)
print(Path("reports/snapshot_eval_template.json").read_text())
print(Path(f"reports/{mode}_snapshot_exec_metrics.json").read_text())
