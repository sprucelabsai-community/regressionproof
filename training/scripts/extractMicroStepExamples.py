import json
import subprocess
from pathlib import Path

projects = json.loads(Path("data/raw/snapshot_projects.json").read_text())


def git(cwd: str, *args: str) -> str:
    return subprocess.check_output(
        ["git", *args],
        cwd=cwd,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()


def classify_local_intent(changed_paths):
    if any(".test." in path or "/__tests__/" in path for path in changed_paths):
        return "writes_test"
    if any(path.endswith(".md") for path in changed_paths):
        return "writes_docs"
    return "writes_prod_code"


with Path("data/staging/micro_step_examples.ndjson").open("w") as out:
    for project in projects:
        if not project["hasGit"]:
            continue

        commits = git(project["mirrorPath"], "rev-list", "--reverse", "HEAD").splitlines()
        history = []

        for index in range(len(commits) - 1):
            current_commit = commits[index]
            next_commit = commits[index + 1]

            try:
                patch = git(project["mirrorPath"], "diff", f"{current_commit}..{next_commit}", "--", ".")
                changed_paths = git(
                    project["mirrorPath"],
                    "diff",
                    "--name-only",
                    f"{current_commit}..{next_commit}",
                    "--",
                    ".",
                ).splitlines()
                test_results = json.loads(
                    git(project["mirrorPath"], "show", f"{current_commit}:.snapshotter/testResults.json")
                )
            except Exception:
                continue

            if not patch.strip():
                continue

            row = {
                "kind": "micro_step_repair",
                "trajectoryId": f"{project['project']}:{commits[0]}",
                "project": project["project"],
                "snapshotRoot": str(Path.home() / ".regressionproof"),
                "mirrorPath": project["mirrorPath"],
                "stepIndex": index,
                "history": history[-5:],
                "currentState": {
                    "commit": current_commit,
                    "changedPaths": changed_paths,
                    "testResultsSummary": test_results.get("summary", {}),
                },
                "localIntent": classify_local_intent(changed_paths),
                "outcomeDelta": "derive_during_normalization_or_eval",
                "nextDiff": patch,
            }
            out.write(json.dumps(row) + "\n")
            history.append({"stepIndex": index, "diff": patch})
