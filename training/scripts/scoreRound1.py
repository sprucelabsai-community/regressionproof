import json
from pathlib import Path


def load_json(path: str):
    file_path = Path(path)
    if not file_path.exists():
        return {"status": "missing", "path": path}
    return json.loads(file_path.read_text())


snapshot_baseline = load_json("reports/baseline_snapshot_exec_metrics.json")
snapshot_finetuned = load_json("reports/finetuned_snapshot_exec_metrics.json")
doc_baseline = load_json("reports/baseline_doc_metrics.json")
doc_finetuned = load_json("reports/finetuned_doc_metrics.json")

if all("status" not in row for row in (snapshot_baseline, snapshot_finetuned, doc_baseline, doc_finetuned)):
    summary = {
        "baseline_snapshot": snapshot_baseline,
        "finetuned_snapshot": snapshot_finetuned,
        "baseline_doc": doc_baseline,
        "finetuned_doc": doc_finetuned,
        "snapshot_fail_to_pass_delta": snapshot_finetuned["fail_to_pass"] - snapshot_baseline["fail_to_pass"],
        "snapshot_pass_to_pass_delta": snapshot_finetuned["pass_to_pass"] - snapshot_baseline["pass_to_pass"],
        "snapshot_failed_test_delta_improvement": snapshot_finetuned["failed_test_delta"] - snapshot_baseline["failed_test_delta"],
        "doc_score_delta": doc_finetuned["doc_score"] - doc_baseline["doc_score"],
    }
else:
    summary = {
        "status": "blocked_or_incomplete",
        "baseline_snapshot": snapshot_baseline,
        "finetuned_snapshot": snapshot_finetuned,
        "baseline_doc": doc_baseline,
        "finetuned_doc": doc_finetuned,
    }

Path("reports/round1_metrics.json").write_text(json.dumps(summary, indent=2))
print(Path("reports/round1_metrics.json").read_text())
