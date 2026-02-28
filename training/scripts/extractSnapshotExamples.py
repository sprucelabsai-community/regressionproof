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


with Path("data/staging/snapshot_examples.ndjson").open("w") as out:
    for project in projects:
        if not project["hasGit"]:
            continue

        commits = git(project["mirrorPath"], "rev-list", "--reverse", "HEAD").splitlines()

        for index in range(len(commits) - 1):
            failing_commit = commits[index]
            repair_commit = commits[index + 1]

            try:
                test_results = json.loads(
                    git(project["mirrorPath"], "show", f"{failing_commit}:.snapshotter/testResults.json")
                )
            except Exception:
                continue

            if test_results.get("summary", {}).get("failedTests", 0) < 1:
                continue

            failing_tests = []
            for suite in test_results.get("suites", []):
                for test in suite.get("tests", []):
                    if not test.get("passed"):
                        failing_tests.append(
                            {
                                "suitePath": suite.get("path"),
                                "testName": test.get("name"),
                                "error": test.get("error", ""),
                            }
                        )

            if not failing_tests:
                continue

            try:
                repair_patch = git(project["mirrorPath"], "diff", f"{failing_commit}..{repair_commit}", "--", ".")
            except Exception:
                continue

            if not repair_patch.strip():
                continue

            row = {
                "kind": "snapshot_repair",
                "snapshotRoot": str(Path.home() / ".regressionproof"),
                "project": project["project"],
                "mirrorPath": project["mirrorPath"],
                "failingCommit": failing_commit,
                "repairCommit": repair_commit,
                "testResultsSummary": test_results["summary"],
                "failingTests": failing_tests,
                "repairPatch": repair_patch,
            }
            out.write(json.dumps(row) + "\n")
