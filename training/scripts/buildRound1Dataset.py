import json
import os
from pathlib import Path

MAX_PATCH = int(os.environ.get("ROUND1_MAX_PATCH_CHARS", "16000"))
MAX_DOC = int(os.environ.get("ROUND1_MAX_DOC_CHARS", "12000"))


def trim(text: str, limit: int) -> str:
    return text.strip()[:limit]


SYSTEM_REPAIR = (
    "You are an expert TDD coding agent. "
    "Use regressionproof snapshot evidence to propose the smallest plausible repair."
)

target = Path("data/normalized/round1.sft.jsonl")

with target.open("w") as out:
    with Path("data/staging/micro_step_examples.ndjson").open() as source:
        for line in source:
            row = json.loads(line)
            ordered_history = "\n\n".join(
                f"STEP {step['stepIndex']}:\n{step['diff']}" for step in row["history"]
            )
            user = (
                f"PROJECT: {row['project']}\n"
                f"TRAJECTORY_ID: {row['trajectoryId']}\n"
                f"STEP_INDEX: {row['stepIndex']}\n"
                f"SNAPSHOT_ROOT: {row['snapshotRoot']}\n"
                f"MIRROR_PATH: {row['mirrorPath']}\n"
                f"LOCAL_INTENT: {row['localIntent']}\n"
                f"OUTCOME_DELTA: {row['outcomeDelta']}\n"
                f"CURRENT_STATE: {json.dumps(row['currentState'])}\n\n"
                f"RECENT_ORDERED_HISTORY:\n{ordered_history}\n\n"
                "Return the next minimal TDD diff only."
            )
            out.write(
                json.dumps(
                    {
                        "kind": "micro_step_repair",
                        "project": row["project"],
                        "trajectoryId": row["trajectoryId"],
                        "stepIndex": row["stepIndex"],
                        "snapshotRoot": row["snapshotRoot"],
                        "mirrorPath": row["mirrorPath"],
                        "localIntent": row["localIntent"],
                        "outcomeDelta": row["outcomeDelta"],
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert TDD coding agent. Produce the next minimal edit in the observed trajectory.",
                            },
                            {"role": "user", "content": user},
                            {"role": "assistant", "content": trim(row["nextDiff"], MAX_PATCH)},
                        ],
                    }
                )
                + "\n"
            )

    with Path("data/staging/snapshot_examples.ndjson").open() as source:
        for line in source:
            row = json.loads(line)
            failing_tests = "\n\n".join(
                f"SUITE: {t['suitePath']}\nTEST: {t['testName']}\nERROR:\n{t['error']}"
                for t in row["failingTests"][:10]
            )
            user = (
                f"PROJECT: {row['project']}\n"
                f"SNAPSHOT_ROOT: {row['snapshotRoot']}\n"
                f"MIRROR_PATH: {row['mirrorPath']}\n"
                f"FAILING_COMMIT: {row['failingCommit']}\n"
                f"REPAIR_COMMIT: {row['repairCommit']}\n"
                f"TEST_SUMMARY: {json.dumps(row['testResultsSummary'])}\n\n"
                f"FAILING_TESTS:\n{failing_tests}\n\n"
                "Return the minimal repair patch."
            )
            out.write(
                json.dumps(
                    {
                        "kind": "snapshot_repair",
                        "project": row["project"],
                        "snapshotRoot": row["snapshotRoot"],
                        "mirrorPath": row["mirrorPath"],
                        "messages": [
                            {"role": "system", "content": SYSTEM_REPAIR},
                            {"role": "user", "content": user},
                            {"role": "assistant", "content": trim(row["repairPatch"], MAX_PATCH)},
                        ],
                    }
                )
                + "\n"
            )

    with Path("data/staging/doc_examples.ndjson").open() as source:
        for line in source:
            row = json.loads(line)
            out.write(
                json.dumps(
                    {
                        "kind": "doc_grounding",
                        "project": "documentation",
                        "sourcePath": row["sourcePath"],
                        "docsRoot": row["docsRoot"],
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are an expert Spruce coding agent. Use only provided documentation.",
                            },
                            row["messages"][1],
                            {
                                "role": "assistant",
                                "content": trim(row["messages"][2]["content"], MAX_DOC),
                            },
                        ],
                    }
                )
                + "\n"
            )
