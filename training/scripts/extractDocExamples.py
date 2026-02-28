import json
from pathlib import Path

MAX_CHARS = 6000
DOCS_ROOT = Path("/Users/taylorromero/Development/SpruceLabs/spruce-documentation")
docs = json.loads(Path("data/raw/docs_inventory.json").read_text())


def chunk_text(text: str, max_chars: int):
    start = 0
    while start < len(text):
        yield text[start:start + max_chars]
        start += max_chars


with Path("data/staging/doc_examples.ndjson").open("w") as out:
    for row in docs:
        path = Path(row["path"])
        try:
            text = path.read_text()
        except Exception:
            continue

        for index, chunk in enumerate(chunk_text(text, MAX_CHARS)):
            prompt = (
                f"DOC_SOURCE: {row['path']}\n"
                f"DOC_CHUNK_INDEX: {index}\n"
                f"DOC_ROOT: {DOCS_ROOT}\n\n"
                "Use only the documentation below.\n"
                "Summarize the concrete engineering rules, commands, paths, and constraints.\n\n"
                f"{chunk}"
            )
            answer = chunk
            out.write(
                json.dumps(
                    {
                        "kind": "doc_grounding",
                        "sourcePath": row["path"],
                        "docsRoot": str(DOCS_ROOT),
                        "messages": [
                            {
                                "role": "system",
                                "content": "You answer strictly from provided Spruce documentation.",
                            },
                            {
                                "role": "user",
                                "content": prompt,
                            },
                            {
                                "role": "assistant",
                                "content": answer,
                            },
                        ],
                    }
                )
                + "\n"
            )
