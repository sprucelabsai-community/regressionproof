import importlib.util
import json
import os
from pathlib import Path


def package_installed(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def main():
    try:
        import torch
    except Exception as error:
        print(
            json.dumps(
                {
                    "status": "blocked",
                    "reason": "torch_import_failed",
                    "detail": str(error),
                },
                indent=2,
            )
        )
        raise SystemExit(1)

    root = Path.cwd()
    result = {
        "status": "ok" if torch.cuda.is_available() else "blocked",
        "cwd": str(root),
        "cuda_available": torch.cuda.is_available(),
        "device_count": torch.cuda.device_count(),
        "devices": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())],
        "cuda_version": torch.version.cuda,
        "torch_version": torch.__version__,
        "bitsandbytes_installed": package_installed("bitsandbytes"),
        "hf_home": os.environ.get("HF_HOME"),
        "round1_model_source": os.environ.get("ROUND1_MODEL_SOURCE"),
        "has_train_split": (root / "data" / "splits" / "train.jsonl").exists(),
        "has_val_split": (root / "data" / "splits" / "val.jsonl").exists(),
        "has_test_split": (root / "data" / "splits" / "test.jsonl").exists(),
        "has_snapshot_eval": (root / "data" / "eval" / "snapshot_eval.jsonl").exists(),
        "has_doc_eval": (root / "data" / "eval" / "doc_eval.jsonl").exists(),
        "has_micro_step_eval": (root / "data" / "eval" / "micro_step_eval.jsonl").exists(),
        "has_round1_env": (root / "config" / "round1.env").exists(),
        "has_accelerate_config": (root / "config" / "accelerate.yaml").exists(),
    }

    print(json.dumps(result, indent=2))

    if not result["cuda_available"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
