# Project Instructions

## EC2 Script Updates

- Whenever we push a change to any EC2 script, always output the command to run it on the EC2 host.
- Commands must use the latest commit hash.
- Always mention `--help` support for scripts when giving commands.

## Invites (manual)

- `regressionproof invite create` prints a token to share manually.
- `invite create` defaults to the current git repo name when no project name is provided.
- `regressionproof invite accept` prints the project URL and token for local storage.
- Use `--help` for CLI usage details.

## Example Commands

These are example commands based on what we have used (without `--sslMode`):

```bash
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/<COMMIT_HASH>/scripts/deploy-ec2.sh -o /tmp/deploy-ec2.sh
bash /tmp/deploy-ec2.sh
```

```bash
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/<COMMIT_HASH>/scripts/update-ec2.sh -o /tmp/update-ec2.sh
bash /tmp/update-ec2.sh
```

```bash
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/<COMMIT_HASH>/scripts/reset-ec2.sh | bash -s -- --force
```

## TDD Callout
We have tests for the Api, but none for the snapshotter. That is ok, because this project is to train AI on how to be better at TDD and writing good tests for this project will come later.