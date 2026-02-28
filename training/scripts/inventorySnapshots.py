import json
import subprocess
from pathlib import Path

root = Path.home() / ".regressionproof"
rows = []


def git(cwd: Path, *args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=cwd, text=True).strip()


for project_path in sorted([p for p in root.iterdir() if p.is_dir()]):
    mirror_path = project_path / "mirror"
    config_path = project_path / "config.json"
    test_results_path = mirror_path / ".snapshotter" / "testResults.json"

    commit_count = 0
    if (mirror_path / ".git").exists():
        try:
            commit_count = int(git(mirror_path, "rev-list", "--count", "HEAD"))
        except Exception:
            commit_count = 0

    rows.append(
        {
            "project": project_path.name,
            "projectPath": str(project_path),
            "mirrorPath": str(mirror_path),
            "hasMirror": mirror_path.exists(),
            "hasGit": (mirror_path / ".git").exists(),
            "hasConfig": config_path.exists(),
            "hasLatestTestResults": test_results_path.exists(),
            "commitCount": commit_count,
        }
    )

Path("data/raw/snapshot_projects.json").write_text(json.dumps(rows, indent=2))
print(
    json.dumps(
        {
            "snapshotRoot": str(root),
            "projects": len(rows),
            "gitMirrors": len([r for r in rows if r["hasGit"]]),
            "totalCommits": sum(r["commitCount"] for r in rows),
        },
        indent=2,
    )
)
