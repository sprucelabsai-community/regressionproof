import json
import os
from pathlib import Path


def write_blocked_outputs(reason: str):
    outputs = {
        "reports/finetuned_snapshot_predictions.jsonl": "snapshot_repair",
        "reports/finetuned_doc_predictions.jsonl": "doc_grounding",
    }
    for path, kind in outputs.items():
        Path(path).write_text(
            json.dumps({"kind": kind, "status": "blocked", "reason": reason}) + "\n"
        )


try:
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
except Exception as error:
    if isinstance(error, ModuleNotFoundError):
        write_blocked_outputs(f"missing_dependency:{error.name}")
    else:
        write_blocked_outputs(f"runtime_import_failed:{type(error).__name__}")
    raise SystemExit(0)

BASE = os.environ.get("ROUND1_MODEL_ID", "Qwen/Qwen2.5-Coder-7B-Instruct")
ADAPTER = f"models/{os.environ.get('ROUND1_RUN_NAME', 'round1-qwen25coder-7b-instruct-qlora')}/final"

try:
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER)
    base_model = AutoModelForCausalLM.from_pretrained(BASE, device_map="auto", torch_dtype="auto")
    model = PeftModel.from_pretrained(base_model, ADAPTER)
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


run("data/eval/snapshot_eval.jsonl", "reports/finetuned_snapshot_predictions.jsonl")
run("data/eval/doc_eval.jsonl", "reports/finetuned_doc_predictions.jsonl")
