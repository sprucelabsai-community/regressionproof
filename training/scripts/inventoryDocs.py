import json
from pathlib import Path

docs_root = Path("/Users/taylorromero/Development/SpruceLabs/spruce-documentation")
skip_dirs = {"node_modules", ".git", "dist", "build", ".next", "coverage"}
rows = []

for path in docs_root.rglob("*.md"):
    if any(part in skip_dirs for part in path.parts):
        continue
    rows.append(
        {
            "path": str(path),
            "size": path.stat().st_size,
            "source": "spruce-documentation",
        }
    )

Path("data/raw/docs_inventory.json").write_text(json.dumps(rows, indent=2))
print(
    json.dumps(
        {
            "docsRoot": str(docs_root),
            "docFiles": len(rows),
        },
        indent=2,
    )
)
