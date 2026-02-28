import json
import os
from pathlib import Path


def resolve_model_source():
    model_source = os.environ.get("ROUND1_MODEL_SOURCE") or os.environ.get(
        "ROUND1_MODEL_ID", "Qwen/Qwen2.5-Coder-7B-Instruct"
    )
    return model_source, Path(model_source).exists()


def write_blocked_output(reason: str):
    output_dir = Path("models") / os.environ.get("ROUND1_RUN_NAME", "round1-qwen25coder-7b-instruct-qlora")
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "blocked.json").write_text(json.dumps({"status": "blocked", "reason": reason}, indent=2))


try:
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
except Exception as error:
    if isinstance(error, ModuleNotFoundError):
        write_blocked_output(f"missing_dependency:{error.name}")
    else:
        write_blocked_output(f"runtime_import_failed:{type(error).__name__}")
    raise SystemExit(0)

MODEL_ID, LOCAL_FILES_ONLY = resolve_model_source()
RUN_NAME = os.environ.get("ROUND1_RUN_NAME", "round1-qwen25coder-7b-instruct-qlora")
MAX_SEQ_LEN = int(os.environ.get("ROUND1_MAX_SEQ_LEN", "4096"))

try:
    dataset = load_dataset(
        "json",
        data_files={
            "train": "data/splits/train.jsonl",
            "validation": "data/splits/val.jsonl",
        },
    )

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, local_files_only=LOCAL_FILES_ONLY)
    tokenizer.pad_token = tokenizer.eos_token
except Exception as error:
    write_blocked_output(f"runtime_setup_failed:{type(error).__name__}")
    raise SystemExit(0)


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
    bnb_4bit_quant_type=os.environ.get("ROUND1_BNB_4BIT_QUANT_TYPE", "nf4"),
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=os.environ.get("ROUND1_BNB_4BIT_USE_DOUBLE_QUANT", "true").lower()
    == "true",
)

try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=quant_config,
        device_map="auto",
        torch_dtype=torch.bfloat16,
        local_files_only=LOCAL_FILES_ONLY,
    )
    model = prepare_model_for_kbit_training(model)
except Exception as error:
    write_blocked_output(f"model_load_failed:{type(error).__name__}")
    raise SystemExit(0)

peft_config = LoraConfig(
    r=int(os.environ.get("ROUND1_LORA_R", "32")),
    lora_alpha=int(os.environ.get("ROUND1_LORA_ALPHA", "64")),
    lora_dropout=float(os.environ.get("ROUND1_LORA_DROPOUT", "0.05")),
    bias="none",
    task_type="CAUSAL_LM",
    target_modules="all-linear",
)

args = TrainingArguments(
    output_dir=f"models/{RUN_NAME}",
    per_device_train_batch_size=int(os.environ.get("ROUND1_MICRO_BATCH", "1")),
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=int(os.environ.get("ROUND1_GRAD_ACCUM", "16")),
    learning_rate=float(os.environ.get("ROUND1_LR", "2e-4")),
    num_train_epochs=float(os.environ.get("ROUND1_TRAIN_EPOCHS", "2")),
    warmup_ratio=float(os.environ.get("ROUND1_WARMUP_RATIO", "0.03")),
    logging_steps=int(os.environ.get("ROUND1_LOG_STEPS", "10")),
    save_steps=int(os.environ.get("ROUND1_SAVE_STEPS", "100")),
    eval_steps=int(os.environ.get("ROUND1_EVAL_STEPS", "100")),
    eval_strategy="steps",
    save_strategy="steps",
    bf16=True,
    report_to=[],
    run_name=RUN_NAME,
)

try:
    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        processing_class=tokenizer,
        peft_config=peft_config,
        dataset_text_field="text",
        max_length=MAX_SEQ_LEN,
        assistant_only_loss=True,
    )

    trainer.train()
    trainer.model.save_pretrained(f"models/{RUN_NAME}/final")
    tokenizer.save_pretrained(f"models/{RUN_NAME}/final")
except Exception as error:
    write_blocked_output(f"training_failed:{type(error).__name__}")
    raise SystemExit(0)
