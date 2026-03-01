# RCA: Step 1 Validation Failure Due to Corrupted `verifyTrainingRoot.sh` on odin1

Date: 2026-03-01  
Stage: Step 1 (Lock `training/` workspace and Python runtime)  
Host: `odin1.local`

## What Failed

Step 1 dependency verification succeeded, but the root-lock verification command failed:

- Command: `bash scripts/verifyTrainingRoot.sh`
- Error: `syntax error near unexpected token 'then'`

This blocked completion of Step 1 validation on odin1.

## Root Cause

The file `/home/odin/Development/SpruceLabs/regressionproof/training/scripts/verifyTrainingRoot.sh` on odin1 had corrupted shell content and was not valid Bash syntax.

The same file in the local repo copy was valid, confirming divergence/corruption on the odin1 working copy.

## Contributing Factors

- No checksum or syntax preflight (`bash -n`) before relying on the script for stage validation.
- The odin1 working copy can drift from the local repo copy between runs.
- Stage validation relied on a single script with no fallback check.

## Recommended Fixes

1. Restore `scripts/verifyTrainingRoot.sh` on odin1 from the known-good repo content before retry.
2. Add a lightweight preflight before stage validation:
- `bash -n scripts/verifyTrainingRoot.sh`
3. Optionally add a guard command in Step 1 logs to print file hash and detect drift:
- `sha256sum scripts/verifyTrainingRoot.sh`
4. Continue RCA-first discipline: for any validation failure, write RCA before retries.
