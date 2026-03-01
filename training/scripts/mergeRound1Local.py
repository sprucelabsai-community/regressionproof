#!/usr/bin/env python3
import argparse
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


def main() -> None:
    parser = argparse.ArgumentParser(description='Merge Round1 LoRA adapter into base model on local machine.')
    parser.add_argument('--base-model', required=True)
    parser.add_argument('--adapter-dir', required=True)
    parser.add_argument('--output-dir', required=True)
    args = parser.parse_args()

    adapter_dir = Path(args.adapter_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print('loading_base', flush=True)
    base = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )

    print('loading_adapter', flush=True)
    model = PeftModel.from_pretrained(base, str(adapter_dir))

    print('merge_and_unload', flush=True)
    merged = model.merge_and_unload(progressbar=True)

    print('save_pretrained', flush=True)
    merged.save_pretrained(str(output_dir), safe_serialization=True, max_shard_size='2GB')

    print('save_tokenizer', flush=True)
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    tokenizer.save_pretrained(str(output_dir))

    print('done', flush=True)


if __name__ == '__main__':
    main()
