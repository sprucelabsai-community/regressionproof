import json
import subprocess
from pathlib import Path


def git(cwd: str, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=cwd, text=True).strip()


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2))


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
print(Path("reports/snapshot_eval_template.json").read_text())
