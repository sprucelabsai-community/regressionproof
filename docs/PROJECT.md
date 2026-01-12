# Project Instructions

## EC2 Script Updates

- Whenever we push a change to any EC2 script, always output the command to run it on the EC2 host.
- Commands must use the latest commit hash.
- Always mention `--help` support for scripts when giving commands.

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
