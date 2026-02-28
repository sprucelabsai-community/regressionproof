import json
from pathlib import Path

rows = [json.loads(line) for line in Path("data/normalized/round1.sft.jsonl").open()]

micro_rows = [row for row in rows if row["kind"] == "micro_step_repair"]
snapshot_rows = [row for row in rows if row["kind"] == "snapshot_repair"]
doc_rows = [row for row in rows if row["kind"] == "doc_grounding"]

projects = sorted({row["project"] for row in snapshot_rows + micro_rows})
doc_sources = sorted({row["sourcePath"] for row in doc_rows})


def split_keys(keys):
    train_cutoff = max(1, int(len(keys) * 0.7))
    val_cutoff = max(train_cutoff + 1, int(len(keys) * 0.85))
    return (
        set(keys[:train_cutoff]),
        set(keys[train_cutoff:val_cutoff]),
        set(keys[val_cutoff:]),
    )


train_projects, val_projects, test_projects = split_keys(projects)
train_doc_sources, val_doc_sources, test_doc_sources = split_keys(doc_sources)

micro_rows = sorted(micro_rows, key=lambda row: (row["trajectoryId"], row["stepIndex"]))

train = [
    row for row in micro_rows if row["project"] in train_projects
] + [
    row for row in snapshot_rows if row["project"] in train_projects
] + [
    row for row in doc_rows if row["sourcePath"] in train_doc_sources
]

val = [
    row for row in micro_rows if row["project"] in val_projects
] + [
    row for row in snapshot_rows if row["project"] in val_projects
] + [
    row for row in doc_rows if row["sourcePath"] in val_doc_sources
]

test = [
    row for row in micro_rows if row["project"] in test_projects
] + [
    row for row in snapshot_rows if row["project"] in test_projects
] + [
    row for row in doc_rows if row["sourcePath"] in test_doc_sources
]

for path, split_rows in (
    ("data/splits/train.jsonl", train),
    ("data/splits/val.jsonl", val),
    ("data/splits/test.jsonl", test),
):
    with Path(path).open("w") as destination:
        for row in split_rows:
            destination.write(json.dumps(row) + "\n")
