import json
import os
from pathlib import Path


def resolve_model_source():
    model_source = os.environ.get("ROUND1_MODEL_SOURCE") or os.environ.get(
        "ROUND1_MODEL_ID", "Qwen/Qwen2.5-Coder-7B-Instruct"
    )
    return model_source, Path(model_source).exists()


def write_blocked_outputs(reason: str):
    outputs = {
        "reports/baseline_snapshot_predictions.jsonl": "snapshot_repair",
        "reports/baseline_doc_predictions.jsonl": "doc_grounding",
    }
    for path, kind in outputs.items():
        Path(path).write_text(
            json.dumps({"kind": kind, "status": "blocked", "reason": reason}) + "\n"
        )


try:
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ModuleNotFoundError as error:
    write_blocked_outputs(f"missing_dependency:{error.name}")
    raise SystemExit(0)

MODEL_ID, LOCAL_FILES_ONLY = resolve_model_source()
MAX_NEW_TOKENS = int(os.environ.get("ROUND1_BASELINE_MAX_NEW_TOKENS", "256"))
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=LOCAL_FILES_ONLY)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map="auto",
        torch_dtype="auto",
        local_files_only=LOCAL_FILES_ONLY,
    )
except Exception as error:
    write_blocked_outputs(f"model_load_failed:{type(error).__name__}")
    raise SystemExit(0)


def run(source_path: str, target_path: str):
    with Path(source_path).open() as src, Path(target_path).open("w") as dst:
        for line in src:
            row = json.loads(line)
            prompt = tokenizer.apply_chat_template(
                row["messages"][:2],
                tokenize=False,
                add_generation_prompt=True,
            )
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            try:
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=MAX_NEW_TOKENS,
                    do_sample=False,
                )
                text = tokenizer.decode(
                    outputs[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
                )
                payload = {
                    "kind": row["kind"],
                    "prediction": text,
                    "target": row["messages"][2]["content"],
                }
            except torch.OutOfMemoryError:
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                payload = {
                    "kind": row["kind"],
                    "status": "blocked",
                    "reason": "generation_failed:OutOfMemoryError",
                    "target": row["messages"][2]["content"],
                }
            dst.write(
                json.dumps(payload) + "\n"
            )


run("data/eval/snapshot_eval.jsonl", "reports/baseline_snapshot_predictions.jsonl")
run("data/eval/doc_eval.jsonl", "reports/baseline_doc_predictions.jsonl")
