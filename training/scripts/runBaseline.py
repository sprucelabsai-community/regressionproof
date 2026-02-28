import json
import os
from pathlib import Path


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

MODEL_ID = os.environ.get("ROUND1_MODEL_ID", "Qwen/Qwen2.5-Coder-7B-Instruct")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, device_map="auto", torch_dtype="auto")


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
            outputs = model.generate(
                **inputs,
                max_new_tokens=800,
                do_sample=False,
                temperature=0.0,
            )
            text = tokenizer.decode(
                outputs[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
            )
            dst.write(
                json.dumps(
                    {
                        "kind": row["kind"],
                        "prediction": text,
                        "target": row["messages"][2]["content"],
                    }
                )
                + "\n"
            )


run("data/eval/snapshot_eval.jsonl", "reports/baseline_snapshot_predictions.jsonl")
run("data/eval/doc_eval.jsonl", "reports/baseline_doc_predictions.jsonl")
