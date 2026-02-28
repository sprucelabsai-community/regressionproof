import json
from pathlib import Path

results = []
for line in Path("data/eval/micro_step_eval.jsonl").open():
    row = json.loads(line)
    results.append(
        {
            "trajectoryId": row["trajectoryId"],
            "stepIndex": row["stepIndex"],
            "status": "pending_micro_step_runner_definition",
            "requiredMetrics": [
                "diff_applies_cleanly",
                "syntax_valid_after_apply",
                "preserves_or_improves_test_status",
                "failed_test_delta",
            ],
        }
    )

Path("reports/micro_step_eval_template.json").write_text(json.dumps(results, indent=2))
print(Path("reports/micro_step_eval_template.json").read_text())
