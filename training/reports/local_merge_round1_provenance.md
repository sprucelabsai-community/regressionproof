# Local Merge Provenance (Option 2)

- Completed UTC: 2026-03-01T04:34:37Z
- Host: local macOS workstation
- OS: macOS 26.2 (Build 25C56)
- Python: 3.10.13 (`training/.venv310`)
- Merge script: `training/scripts/mergeRound1Local.py`

## Inputs

### LoRA adapter (from repo training artifacts)
- Path: `training/models/round1-qwen25coder-7b-instruct-qlora-fallback/final`
- Checksums: `training/reports/local_merge_round1_adapter.sha256`

### Base model (copied from odin1 HF cache)
- Source on odin1:
  - `/home/odin/.cache/huggingface/hub/models--Qwen--Qwen2.5-Coder-7B-Instruct/snapshots/c03e6d358207e414f1eca0bb1891e29f1db0e242`
- Local path:
  - `training/tmp/base-models/Qwen2.5-Coder-7B-Instruct`
- Checksums: `training/reports/local_merge_round1_base.sha256`

## Merge Command

```bash
OMP_NUM_THREADS=1 KMP_AFFINITY=disabled KMP_BLOCKTIME=0 \
training/.venv310/bin/python training/scripts/mergeRound1Local.py \
  --base-model training/tmp/base-models/Qwen2.5-Coder-7B-Instruct \
  --adapter-dir training/models/round1-qwen25coder-7b-instruct-qlora-fallback/final \
  --output-dir training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged-local-mac \
  > training/logs/local-merge-round1.log 2>&1
```

## Outputs

- Output path: `training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged-local-mac`
- Size: ~14G
- File manifest + sha256: `training/reports/local_merge_round1_merged.sha256`
- Runtime log: `training/logs/local-merge-round1.log`

## Notes

- Log reached terminal state with `save_tokenizer` and `done`.
- Warnings in log include non-fatal PEFT parameter warnings and bitsandbytes CPU warning.

## Sync to odin1

```bash
sshpass -p 'password' rsync -a --delete -e "ssh -o StrictHostKeyChecking=no" \
  training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged-local-mac/ \
  odin@odin1.local:/home/odin/Development/SpruceLabs/regressionproof/training/models/round1-qwen25coder-7b-instruct-qlora-fallback/merged/
```

## Integrity Verification

- Remote manifest: `training/reports/odin1_merge_round1_merged.sha256`
- Local vs remote diff: `training/reports/local_vs_odin1_merged.diff`
- Result: `DIFF_EMPTY` (all file checksums matched)
