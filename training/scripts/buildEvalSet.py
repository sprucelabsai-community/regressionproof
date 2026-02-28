import json
import os
from pathlib import Path

rows = [json.loads(line) for line in Path("data/splits/test.jsonl").open()]
limit = int(os.environ.get("ROUND1_EVAL_SIZE", "50"))

micro_rows = [row for row in rows if row["kind"] == "micro_step_repair"][:limit]
snapshot_rows = [row for row in rows if row["kind"] == "snapshot_repair"][:limit]
doc_rows = [row for row in rows if row["kind"] == "doc_grounding"][:limit]

for path, split_rows in (
    ("data/eval/micro_step_eval.jsonl", micro_rows),
    ("data/eval/snapshot_eval.jsonl", snapshot_rows),
    ("data/eval/doc_eval.jsonl", doc_rows),
):
    with Path(path).open("w") as destination:
        for row in split_rows:
            destination.write(json.dumps(row) + "\n")
