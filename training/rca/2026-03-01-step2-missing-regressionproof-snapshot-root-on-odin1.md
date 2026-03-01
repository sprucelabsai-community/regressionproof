# RCA: Step 2 Failed Due to Missing Snapshot Root on odin1

Date: 2026-03-01  
Stage: Step 2 (Inventory regressionproof snapshot sources)  
Host: `odin1.local`

## What Failed

The Step 2 inventory command failed while iterating the configured snapshot root.

- Command: `python3 scripts/inventorySnapshots.py`
- Error: `FileNotFoundError: [Errno 2] No such file or directory: '/home/odin/.regressionproof'`

## Root Cause

The expected regressionproof snapshot root path (`~/.regressionproof`) is not present on odin1 for user `odin`.

## Contributing Factors

- Step 2 script currently assumes `Path.home() / ".regressionproof"` exists and does not support a fallback/override path.
- Environment/data locality mismatch: snapshot corpus appears available on the local Mac path, but not yet present on odin1.
- No preflight existence check before inventory extraction.

## Recommended Fixes

1. Add a preflight check in Step 2 to validate snapshot root existence before inventory.
2. Support `ROUND1_SNAPSHOT_ROOT` as an explicit override in `inventorySnapshots.py`.
3. Ensure snapshot corpus is available on odin1 before Step 2 runs (sync/copy from source host if needed).
4. Keep RCA-first discipline for all validation failures before retries.
