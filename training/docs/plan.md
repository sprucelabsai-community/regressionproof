# Round 1 Fine-Tuning Plan

Plan status:
- `[ ]` Step 1: Lock the `training/` workspace and Python runtime
- `[ ]` Step 2: Inventory regressionproof snapshot sources from `~/.regressionproof`
- `[ ]` Step 3: Inventory Spruce documentation sources from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- `[ ]` Step 4: Extract ordered regressionproof micro-step and snapshot repair examples with Python
- `[ ]` Step 5: Extract documentation-grounded guidance examples with Python
- `[ ]` Step 6: Merge `micro_step_repair`, `snapshot_repair`, and `doc_grounding` into one conversational SFT format
- `[ ]` Step 7: Build train/val/test splits with leakage control
- `[ ]` Step 8: Build frozen evaluation sets for execution-based repair eval and doc-grounding eval
- `[ ]` Step 9: Run baseline inference and baseline execution evaluation
- `[ ]` Step 10: Fine-tune the first model with QLoRA
- `[ ]` Step 11: Run post-train execution evaluation and compare against baseline
- `[ ]` Step 12: Package the run and freeze the artifacts
- `[ ]` Step 13: Export the trained model into a serving-ready artifact
- `[ ]` Step 14: Host the model behind a URL with an OpenAI-compatible API
- `[ ]` Step 15: Register the served model by name and route requests to it

## Step 1: Lock the `training/` workspace and Python runtime

Files to add or overwrite:
- `training/requirements.round1.txt`
- `training/config/round1.env`
- `training/scripts/verifyTrainingRoot.sh`

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
mkdir -p config scripts data/raw data/staging data/normalized data/splits data/eval runs reports models logs tmp
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.round1.txt
bash scripts/verifyTrainingRoot.sh
```

`training/requirements.round1.txt`

```txt
datasets==3.3.2
pandas==2.3.2
pyarrow==21.0.0
pydantic==2.11.7
scikit-learn==1.7.1
transformers==4.55.4
trl==0.21.0
peft==0.17.1
accelerate==1.10.1
evaluate==0.4.5
bitsandbytes==0.47.0
sentencepiece==0.2.0
```

`training/config/round1.env`

```bash
export ROUND1_MODEL_ID=Qwen/Qwen2.5-Coder-7B-Instruct
export ROUND1_RUN_NAME=round1-qwen25coder-7b-instruct-qlora
export ROUND1_MAX_SEQ_LEN=4096
export ROUND1_TRAIN_EPOCHS=2
export ROUND1_LORA_R=32
export ROUND1_LORA_ALPHA=64
export ROUND1_LORA_DROPOUT=0.05
export ROUND1_MICRO_BATCH=1
export ROUND1_GRAD_ACCUM=16
export ROUND1_LR=2e-4
export ROUND1_WARMUP_RATIO=0.03
export ROUND1_LOG_STEPS=10
export ROUND1_SAVE_STEPS=100
export ROUND1_EVAL_STEPS=100
export ROUND1_MAX_PATCH_CHARS=16000
export ROUND1_MAX_DOC_CHARS=12000
export ROUND1_EVAL_SIZE=50
export ROUND1_SNAPSHOT_ROOT="$HOME/.regressionproof"
export ROUND1_DOCS_ROOT="/Users/taylorromero/Development/SpruceLabs/spruce-documentation"
export ROUND1_BNB_4BIT_QUANT_TYPE=nf4
export ROUND1_BNB_4BIT_COMPUTE_DTYPE=bfloat16
export ROUND1_BNB_4BIT_USE_DOUBLE_QUANT=true
```

`training/scripts/verifyTrainingRoot.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
EXPECTED="/Users/taylorromero/Development/SpruceLabs/regressionproof/training"
ACTUAL="$(pwd)"
test "$ACTUAL" = "$EXPECTED"
echo "training root verified: $ACTUAL"
```

## Step 2: Inventory regressionproof snapshot sources from `~/.regressionproof`

Files to add:
- `training/scripts/inventorySnapshots.py`
- `training/data/raw/snapshot_projects.json`

`training/scripts/inventorySnapshots.py`

```python
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

    rows.append({
        "project": project_path.name,
        "projectPath": str(project_path),
        "mirrorPath": str(mirror_path),
        "hasMirror": mirror_path.exists(),
        "hasGit": (mirror_path / ".git").exists(),
        "hasConfig": config_path.exists(),
        "hasLatestTestResults": test_results_path.exists(),
        "commitCount": commit_count,
    })

Path("data/raw/snapshot_projects.json").write_text(json.dumps(rows, indent=2))
print(json.dumps({
    "snapshotRoot": str(root),
    "projects": len(rows),
    "gitMirrors": len([r for r in rows if r["hasGit"]]),
    "totalCommits": sum(r["commitCount"] for r in rows),
}, indent=2))
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/inventorySnapshots.py
cat data/raw/snapshot_projects.json
```

## Step 3: Inventory Spruce documentation sources from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

Files to add:
- `training/scripts/inventoryDocs.py`
- `training/data/raw/docs_inventory.json`

`training/scripts/inventoryDocs.py`

```python
import json
from pathlib import Path

docs_root = Path("/Users/taylorromero/Development/SpruceLabs/spruce-documentation")
skip_dirs = {"node_modules", ".git", "dist", "build", ".next", "coverage"}
rows = []

for path in docs_root.rglob("*.md"):
    if any(part in skip_dirs for part in path.parts):
        continue
    rows.append({
        "path": str(path),
        "size": path.stat().st_size,
        "source": "spruce-documentation",
    })

Path("data/raw/docs_inventory.json").write_text(json.dumps(rows, indent=2))
print(json.dumps({
    "docsRoot": str(docs_root),
    "docFiles": len(rows),
}, indent=2))
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/inventoryDocs.py
cat data/raw/docs_inventory.json
```

## Step 4: Extract ordered regressionproof micro-step and snapshot repair examples with Python

Files to add:
- `training/scripts/extractSnapshotExamples.py`
- `training/data/staging/snapshot_examples.ndjson`
- `training/scripts/extractMicroStepExamples.py`
- `training/data/staging/micro_step_examples.ndjson`

Regressionproof data must be treated as a step-by-step trajectory source, not only as coarse red-green-refactor checkpoints. Each trajectory preserves every discrete line change in order, which means the training corpus must represent:

- current state before the next micro-edit
- next diff only
- test feedback at that point in the trajectory
- local intent such as test-writing vs production-code-writing
- sequencing context from recent prior edits
- outcome delta after the edit when derivable
- optional Spruce documentation context

Within-trajectory ordering must be preserved. Do not shuffle or flatten steps from the same trajectory into unordered examples.

`training/scripts/extractSnapshotExamples.py`

```python
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
                        failing_tests.append({
                            "suitePath": suite.get("path"),
                            "testName": test.get("name"),
                            "error": test.get("error", ""),
                        })

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
```

`training/scripts/extractMicroStepExamples.py`

```python
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
                changed_paths = git(project["mirrorPath"], "diff", "--name-only", f"{current_commit}..{next_commit}", "--", ".").splitlines()
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
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/extractSnapshotExamples.py
python3 scripts/extractMicroStepExamples.py
wc -l data/staging/snapshot_examples.ndjson
wc -l data/staging/micro_step_examples.ndjson
sed -n '1,2p' data/staging/snapshot_examples.ndjson
sed -n '1,2p' data/staging/micro_step_examples.ndjson
```

## Step 5: Extract documentation-grounded guidance examples with Python

Files to add:
- `training/scripts/extractDocExamples.py`
- `training/data/staging/doc_examples.ndjson`

`training/scripts/extractDocExamples.py`

```python
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
            out.write(json.dumps({
                "kind": "doc_grounding",
                "sourcePath": row["path"],
                "docsRoot": str(DOCS_ROOT),
                "messages": [
                    {
                        "role": "system",
                        "content": "You answer strictly from provided Spruce documentation."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    },
                    {
                        "role": "assistant",
                        "content": answer
                    }
                ]
            }) + "\n")
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/extractDocExamples.py
wc -l data/staging/doc_examples.ndjson
sed -n '1,2p' data/staging/doc_examples.ndjson
```

## Step 6: Merge `micro_step_repair`, `snapshot_repair`, and `doc_grounding` into one strict conversational SFT format

Files to add:
- `training/scripts/buildRound1Dataset.py`
- `training/data/normalized/round1.sft.jsonl`

Requirements for `training/scripts/buildRound1Dataset.py`:
- keep `kind: micro_step_repair` rows sourced from ordered regressionproof trajectories in `~/.regressionproof`
- keep `kind: snapshot_repair` rows sourced from `~/.regressionproof`
- keep `kind: doc_grounding` rows sourced from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- preserve `mirrorPath`, `snapshotRoot`, `sourcePath`, and `docsRoot`
- preserve `trajectoryId`, `stepIndex`, `history`, `currentState`, `localIntent`, and `outcomeDelta` for micro-step records
- emit `messages` in conversational format for `SFTTrainer`
- keep assistant content as the only supervised target during training
- structure micro-step examples so the input contains current state and recent ordered history and the target contains only the next micro-diff
- do not reorder steps within a trajectory during extraction or normalization

`training/scripts/buildRound1Dataset.py`

```python
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

SYSTEM_DOC = (
    "You are an expert Spruce coding agent. "
    "Use only provided documentation and preserve its commands, constraints, and file paths."
)

target = Path("data/normalized/round1.sft.jsonl")

with target.open("w") as out:
    for line in Path("data/staging/micro_step_examples.ndjson").open():
        row = json.loads(line)
        ordered_history = "\n\n".join(
            f"STEP {step['stepIndex']}:\n{step['diff']}"
            for step in row["history"]
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
        out.write(json.dumps({
            "kind": "micro_step_repair",
            "project": row["project"],
            "trajectoryId": row["trajectoryId"],
            "stepIndex": row["stepIndex"],
            "snapshotRoot": row["snapshotRoot"],
            "mirrorPath": row["mirrorPath"],
            "localIntent": row["localIntent"],
            "outcomeDelta": row["outcomeDelta"],
            "messages": [
                {"role": "system", "content": "You are an expert TDD coding agent. Produce the next minimal edit in the observed trajectory."},
                {"role": "user", "content": user},
                {"role": "assistant", "content": trim(row["nextDiff"], MAX_PATCH)},
            ],
        }) + "\n")

    for line in Path("data/staging/snapshot_examples.ndjson").open():
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
        out.write(json.dumps({
            "kind": "snapshot_repair",
            "project": row["project"],
            "snapshotRoot": row["snapshotRoot"],
            "mirrorPath": row["mirrorPath"],
            "messages": [
                {"role": "system", "content": SYSTEM_REPAIR},
                {"role": "user", "content": user},
                {"role": "assistant", "content": trim(row["repairPatch"], MAX_PATCH)},
            ],
        }) + "\n")

    for line in Path("data/staging/doc_examples.ndjson").open():
        row = json.loads(line)
        out.write(json.dumps({
            "kind": "doc_grounding",
            "project": "documentation",
            "sourcePath": row["sourcePath"],
            "docsRoot": row["docsRoot"],
            "messages": [
                {"role": "system", "content": "You are an expert Spruce coding agent. Use only provided documentation."},
                row["messages"][1],
                {"role": "assistant", "content": trim(row["messages"][2]["content"], MAX_DOC)},
            ],
        }) + "\n")
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
set -a
source config/round1.env
set +a
python3 scripts/buildRound1Dataset.py
wc -l data/normalized/round1.sft.jsonl
sed -n '1,3p' data/normalized/round1.sft.jsonl
```

## Step 7: Build train/val/test splits with leakage control

Files to add:
- `training/scripts/splitRound1Dataset.py`
- `training/data/splits/train.jsonl`
- `training/data/splits/val.jsonl`
- `training/data/splits/test.jsonl`

Rules:
- micro-step rows split by `trajectoryId` or `project`, while preserving within-trajectory order
- snapshot rows split by `project` from `~/.regressionproof`
- doc rows split by `sourcePath` from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- batch order can be shuffled across independent trajectories, but the local history inside each micro-step example must remain chronological

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/splitRound1Dataset.py
wc -l data/splits/train.jsonl data/splits/val.jsonl data/splits/test.jsonl
```

## Step 8: Build frozen evaluation sets for execution-based repair eval and doc-grounding eval

Files to add:
- `training/scripts/buildEvalSet.py`
- `training/data/eval/micro_step_eval.jsonl`
- `training/data/eval/snapshot_eval.jsonl`
- `training/data/eval/doc_eval.jsonl`
- `training/scripts/runSnapshotEval.py`
- `training/scripts/runMicroStepEval.py`
- `training/scripts/scoreDocGrounding.py`

Requirements:
- `micro_step_eval.jsonl` contains ordered `micro_step_repair` examples traced to `~/.regressionproof`
- `snapshot_eval.jsonl` contains only examples traced to `~/.regressionproof`
- `doc_eval.jsonl` contains only examples traced to `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- snapshot evaluation is execution-based, not text-similarity-based
- micro-step evaluation records whether the generated next diff applies cleanly, preserves syntax, and improves or preserves test status

`training/scripts/runSnapshotEval.py`

```python
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
    results.append({
        "project": row["project"],
        "mirrorPath": row["mirrorPath"],
        "failingCommit": row["messages"][1]["content"],
        "status": "pending_manual_runner_definition"
    })

write_json(Path("reports/snapshot_eval_template.json"), results)
print(Path("reports/snapshot_eval_template.json").read_text())
```

Execution contract for `runSnapshotEval.py`:
- checkout the held-out failing state inside a disposable worktree copied under `training/tmp/`
- apply the generated patch
- run the project test command
- record `fail_to_pass`, `pass_to_pass`, `failed_test_delta`, and exit status

`training/scripts/runMicroStepEval.py`

```python
import json
from pathlib import Path

results = []
for line in Path("data/eval/micro_step_eval.jsonl").open():
    row = json.loads(line)
    results.append({
        "trajectoryId": row["trajectoryId"],
        "stepIndex": row["stepIndex"],
        "status": "pending_micro_step_runner_definition",
        "requiredMetrics": [
            "diff_applies_cleanly",
            "syntax_valid_after_apply",
            "preserves_or_improves_test_status",
            "failed_test_delta",
        ],
    })

Path("reports/micro_step_eval_template.json").write_text(json.dumps(results, indent=2))
print(Path("reports/micro_step_eval_template.json").read_text())
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
set -a
source config/round1.env
set +a
python3 scripts/buildEvalSet.py
python3 scripts/runMicroStepEval.py
python3 scripts/runSnapshotEval.py
wc -l data/eval/micro_step_eval.jsonl data/eval/snapshot_eval.jsonl data/eval/doc_eval.jsonl
```

## Step 9: Run baseline inference and baseline execution evaluation

Files to add:
- `training/scripts/runBaseline.py`
- `training/reports/baseline_snapshot_predictions.jsonl`
- `training/reports/baseline_doc_predictions.jsonl`

Requirements:
- baseline micro-step predictions must be evaluated as next-diff actions on ordered trajectories
- baseline snapshot predictions must feed into execution-based evaluation
- doc predictions can use a text or structured scoring pass separately

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
python3 scripts/runBaseline.py
python3 scripts/runMicroStepEval.py
python3 scripts/runSnapshotEval.py
wc -l reports/baseline_snapshot_predictions.jsonl reports/baseline_doc_predictions.jsonl
```

## Step 10: Fine-tune the first model with QLoRA

Files to add:
- `training/config/accelerate.yaml`
- `training/scripts/trainRound1.py`

`training/scripts/trainRound1.py`

```python
import os
import torch
from datasets import load_dataset
from peft import LoraConfig, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer

MODEL_ID = os.environ["ROUND1_MODEL_ID"]
RUN_NAME = os.environ["ROUND1_RUN_NAME"]
MAX_SEQ_LEN = int(os.environ["ROUND1_MAX_SEQ_LEN"])

dataset = load_dataset("json", data_files={
    "train": "data/splits/train.jsonl",
    "validation": "data/splits/val.jsonl",
})

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token

def format_row(row):
    return {
        "text": tokenizer.apply_chat_template(
            row["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )
    }

dataset = dataset.map(format_row)

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type=os.environ["ROUND1_BNB_4BIT_QUANT_TYPE"],
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=os.environ["ROUND1_BNB_4BIT_USE_DOUBLE_QUANT"].lower() == "true",
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=quant_config,
    device_map="auto",
    torch_dtype=torch.bfloat16,
)
model = prepare_model_for_kbit_training(model)

peft_config = LoraConfig(
    r=int(os.environ["ROUND1_LORA_R"]),
    lora_alpha=int(os.environ["ROUND1_LORA_ALPHA"]),
    lora_dropout=float(os.environ["ROUND1_LORA_DROPOUT"]),
    bias="none",
    task_type="CAUSAL_LM",
    target_modules="all-linear",
)

args = TrainingArguments(
    output_dir=f"models/{RUN_NAME}",
    per_device_train_batch_size=int(os.environ["ROUND1_MICRO_BATCH"]),
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=int(os.environ["ROUND1_GRAD_ACCUM"]),
    learning_rate=float(os.environ["ROUND1_LR"]),
    num_train_epochs=float(os.environ["ROUND1_TRAIN_EPOCHS"]),
    warmup_ratio=float(os.environ["ROUND1_WARMUP_RATIO"]),
    logging_steps=int(os.environ["ROUND1_LOG_STEPS"]),
    save_steps=int(os.environ["ROUND1_SAVE_STEPS"]),
    eval_steps=int(os.environ["ROUND1_EVAL_STEPS"]),
    evaluation_strategy="steps",
    save_strategy="steps",
    bf16=True,
    report_to=[],
    run_name=RUN_NAME,
)

trainer = SFTTrainer(
    model=model,
    args=args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    processing_class=tokenizer,
    peft_config=peft_config,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
    assistant_only_loss=True,
)

trainer.train()
trainer.model.save_pretrained(f"models/{RUN_NAME}/final")
tokenizer.save_pretrained(f"models/{RUN_NAME}/final")
```

Training requirements:
- use QLoRA, not generic full fine-tuning
- use `nf4`
- use `torch.bfloat16`
- call `prepare_model_for_kbit_training()`
- use `target_modules="all-linear"`
- use assistant-only loss

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
set -a
source config/round1.env
set +a
accelerate launch --config_file config/accelerate.yaml scripts/trainRound1.py | tee logs/round1-train.log
```

## Step 11: Run post-train execution evaluation and compare against baseline

Files to add:
- `training/scripts/runFinetunedEval.py`
- `training/scripts/scoreRound1.py`
- `training/reports/finetuned_snapshot_predictions.jsonl`
- `training/reports/finetuned_doc_predictions.jsonl`
- `training/reports/round1_metrics.json`

Metric requirements:
- primary micro-step metrics: `diff_applies_cleanly`, `syntax_valid_after_apply`, `preserves_or_improves_test_status`, `failed_test_delta`
- primary metrics: `fail_to_pass`, `pass_to_pass`, `failed_test_delta`
- secondary doc metric: doc-grounding score on held-out Spruce docs
- optional diagnostic metric: text similarity

`training/scripts/scoreRound1.py`

```python
import json
from pathlib import Path

def load_json(path: str):
    return json.loads(Path(path).read_text())

snapshot_baseline = load_json("reports/baseline_snapshot_exec_metrics.json")
snapshot_finetuned = load_json("reports/finetuned_snapshot_exec_metrics.json")
doc_baseline = load_json("reports/baseline_doc_metrics.json")
doc_finetuned = load_json("reports/finetuned_doc_metrics.json")

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

Path("reports/round1_metrics.json").write_text(json.dumps(summary, indent=2))
print(Path("reports/round1_metrics.json").read_text())
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
set -a
source config/round1.env
set +a
python3 scripts/runFinetunedEval.py
python3 scripts/runSnapshotEval.py
python3 scripts/scoreRound1.py
cat reports/round1_metrics.json
```

## Step 12: Package the run and freeze the artifacts

Files to add:
- `training/scripts/packageRound1.sh`
- `training/reports/round1_report.md`

`training/reports/round1_report.md` must explicitly state:
- snapshot corpus root: `~/.regressionproof`
- documentation corpus root: `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- baseline and finetuned execution metrics for snapshot repair tasks
- baseline and finetuned doc-grounding metrics for held-out documentation tasks

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv/bin/activate
set -a
source config/round1.env
set +a
bash scripts/packageRound1.sh
ls -lh runs
```

## Step 13: Export the trained model into a serving-ready artifact

Files to add:
- `training/scripts/exportRound1ForServing.py`
- `training/config/serving/round1-serving.env`
- `training/models/round1-qwen25coder-7b-instruct-qlora/serving/`

Serving requirement:
- the trained model must be runnable behind a stable HTTP URL
- the served model must be addressable by a stable name such as `round1-tdd-coder`
- the deployment artifact must preserve the relationship to:
  - regressionproof snapshot training data from `~/.regressionproof`
  - Spruce documentation grounding data from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`

`training/config/serving/round1-serving.env`

```bash
export ROUND1_SERVED_MODEL_NAME=round1-tdd-coder
export ROUND1_BASE_MODEL_ID=Qwen/Qwen2.5-Coder-7B-Instruct
export ROUND1_ADAPTER_DIR=models/round1-qwen25coder-7b-instruct-qlora/final
export ROUND1_MERGED_MODEL_DIR=models/round1-qwen25coder-7b-instruct-qlora/serving/merged
export ROUND1_SERVING_MANIFEST=models/round1-qwen25coder-7b-instruct-qlora/serving/manifest.json
```

`training/scripts/exportRound1ForServing.py`

```python
import json
import os
from pathlib import Path

try:
    from peft import AutoPeftModelForCausalLM
    from transformers import AutoTokenizer
except Exception as error:
    output = Path(os.environ.get("ROUND1_SERVING_MANIFEST", "models/round1-qwen25coder-7b-instruct-qlora/serving/manifest.json"))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({
        "status": "blocked",
        "reason": f"runtime_import_failed:{type(error).__name__}",
    }, indent=2))
    raise SystemExit(0)

adapter_dir = os.environ["ROUND1_ADAPTER_DIR"]
merged_dir = Path(os.environ["ROUND1_MERGED_MODEL_DIR"])
manifest_path = Path(os.environ["ROUND1_SERVING_MANIFEST"])
served_model_name = os.environ["ROUND1_SERVED_MODEL_NAME"]

merged_dir.mkdir(parents=True, exist_ok=True)

model = AutoPeftModelForCausalLM.from_pretrained(adapter_dir, device_map="cpu")
merged_model = model.merge_and_unload()
tokenizer = AutoTokenizer.from_pretrained(adapter_dir)

merged_model.save_pretrained(merged_dir)
tokenizer.save_pretrained(merged_dir)

manifest_path.write_text(json.dumps({
    "status": "ready",
    "servedModelName": served_model_name,
    "artifactPath": str(merged_dir),
    "baseModelId": os.environ["ROUND1_BASE_MODEL_ID"],
    "adapterDir": adapter_dir,
    "snapshotRoot": os.path.expanduser("~/.regressionproof"),
    "docsRoot": "/Users/taylorromero/Development/SpruceLabs/spruce-documentation",
}, indent=2))

print(manifest_path.read_text())
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv310/bin/activate
set -a
source config/round1.env
source config/serving/round1-serving.env
set +a
python3 scripts/exportRound1ForServing.py
cat models/round1-qwen25coder-7b-instruct-qlora/serving/manifest.json
```

## Step 14: Host the model behind a URL with an OpenAI-compatible API

Files to add:
- `training/scripts/startRound1Server.sh`
- `training/config/serving/round1-vllm.env`
- `training/logs/round1-server.log`

Hosting approach:
- serve the merged model through an OpenAI-compatible API
- bind the server to a stable local or network URL
- use a served model name so clients can address it without hard-coding filesystem paths

`training/config/serving/round1-vllm.env`

```bash
export ROUND1_SERVER_HOST=0.0.0.0
export ROUND1_SERVER_PORT=8010
export ROUND1_SERVER_URL=http://127.0.0.1:8010/v1
export ROUND1_GPU_MEMORY_UTILIZATION=0.90
```

`training/scripts/startRound1Server.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${ROUND1_MERGED_MODEL_DIR:?ROUND1_MERGED_MODEL_DIR is required}"
: "${ROUND1_SERVED_MODEL_NAME:?ROUND1_SERVED_MODEL_NAME is required}"
: "${ROUND1_SERVER_HOST:?ROUND1_SERVER_HOST is required}"
: "${ROUND1_SERVER_PORT:?ROUND1_SERVER_PORT is required}"

mkdir -p logs

python3 -m vllm.entrypoints.openai.api_server \
  --host "$ROUND1_SERVER_HOST" \
  --port "$ROUND1_SERVER_PORT" \
  --model "$ROUND1_MERGED_MODEL_DIR" \
  --served-model-name "$ROUND1_SERVED_MODEL_NAME" \
  --gpu-memory-utilization "${ROUND1_GPU_MEMORY_UTILIZATION:-0.90}" \
  > logs/round1-server.log 2>&1
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv310/bin/activate
set -a
source config/round1.env
source config/serving/round1-serving.env
source config/serving/round1-vllm.env
set +a
bash scripts/startRound1Server.sh
```

Smoke test commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
curl -s http://127.0.0.1:8010/v1/models | jq .
curl -s http://127.0.0.1:8010/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "round1-tdd-coder",
    "messages": [
      {"role": "system", "content": "You write TDD code by the three laws."},
      {"role": "user", "content": "Write the next minimal failing test for a missing add(a, b) function."}
    ],
    "temperature": 0
  }' | jq .
```

## Step 15: Register the served model by name and route requests to it

Files to add:
- `training/config/serving/model-registry.json`
- `training/scripts/serveModelRegistry.py`
- `training/scripts/testModelRegistry.sh`

Addressability requirement:
- callers must be able to use a stable model name instead of a raw host/port pair
- the registry must map a model name to a serving URL and artifact metadata
- the router must accept an OpenAI-style request and forward it to the correct backend by the `model` field

`training/config/serving/model-registry.json`

```json
{
  "round1-tdd-coder": {
    "provider": "vllm",
    "baseUrl": "http://127.0.0.1:8010/v1",
    "chatCompletionsPath": "/chat/completions",
    "modelsPath": "/models",
    "artifactPath": "models/round1-qwen25coder-7b-instruct-qlora/serving/merged",
    "snapshotRoot": "/Users/taylorromero/.regressionproof",
    "docsRoot": "/Users/taylorromero/Development/SpruceLabs/spruce-documentation"
  }
}
```

`training/scripts/serveModelRegistry.py`

```python
import json
import os
from pathlib import Path

import requests
from flask import Flask, jsonify, request, Response

registry = json.loads(Path("config/serving/model-registry.json").read_text())
app = Flask(__name__)

@app.get("/v1/models")
def models():
    return jsonify({
        "data": [
            {"id": model_name, **config}
            for model_name, config in registry.items()
        ]
    })

@app.post("/v1/chat/completions")
def chat_completions():
    payload = request.get_json(force=True)
    model_name = payload["model"]
    config = registry[model_name]
    upstream = f"{config['baseUrl']}{config['chatCompletionsPath']}"
    response = requests.post(upstream, json=payload, timeout=600)
    return Response(
        response.content,
        status=response.status_code,
        content_type=response.headers.get("content-type", "application/json"),
    )

if __name__ == "__main__":
    host = os.environ.get("ROUND1_REGISTRY_HOST", "0.0.0.0")
    port = int(os.environ.get("ROUND1_REGISTRY_PORT", "8020"))
    app.run(host=host, port=port)
```

`training/scripts/testModelRegistry.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

curl -s http://127.0.0.1:8020/v1/models | jq .
curl -s http://127.0.0.1:8020/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "round1-tdd-coder",
    "messages": [
      {"role": "system", "content": "You write TDD code by the three laws."},
      {"role": "user", "content": "Given a failing test, return only the next minimal diff."}
    ],
    "temperature": 0
  }' | jq .
```

Commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
source .venv310/bin/activate
export ROUND1_REGISTRY_HOST=0.0.0.0
export ROUND1_REGISTRY_PORT=8020
python3 scripts/serveModelRegistry.py
```

Validation commands:

```bash
cd /Users/taylorromero/Development/SpruceLabs/regressionproof/training
bash scripts/testModelRegistry.sh
```

Deployment gate:
- Step 13 must produce a serving manifest with `status: "ready"` before Step 14 is considered ready
- Step 14 must answer `GET /v1/models` and `POST /v1/chat/completions`
- Step 15 must resolve `model: "round1-tdd-coder"` to the correct upstream URL without changing client payload shape

## Guardrail coverage

Regressionproof snapshots:
- used as supervised process and repair data from `~/.regressionproof/*/mirror`
- represented as ordered micro-step trajectories rather than only coarse red-green-refactor checkpoints
- `micro_step_repair` captures every discrete line change as next-step supervision
- `.snapshotter/testResults.json` is part of example construction
- `snapshot_repair` captures coarser repair states and outcomes
- dedicated micro-step and snapshot evaluation use execution-based metrics

Spruce documentation:
- used as supervised grounding data from `/Users/taylorromero/Development/SpruceLabs/spruce-documentation`
- markdown chunks become doc-grounding instruction/answer pairs
- dedicated doc evaluation verifies held-out grounding quality

## Research alignment summary

This plan reflects the findings in [fine-tuning-research.md](/Users/taylorromero/Development/SpruceLabs/regressionproof/training/docs/fine-tuning-research.md):

- Python is the primary language for dataset building, training, and evaluation.
- QLoRA is the round 1 fine-tuning approach.
- Assistant-only loss is an explicit training requirement.
- Snapshot repair evaluation is execution-based rather than text-similarity-based.
- Regressionproof trajectories are treated as ordered process-supervision data with current state, next diff, test feedback, local intent, sequencing context, outcome delta, and optional doc context.
- Spruce documentation is trained and evaluated as a separate grounding task family.
