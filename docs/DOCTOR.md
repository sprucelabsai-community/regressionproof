# RegressionProof Doctor (v1)

This document defines the initial set of diagnostics for `npx regressionproof doctor`.

## Goals

- Detect common setup issues early.
- Provide actionable, minimal fixes (init vs invite accept).
- Avoid false positives for first-time snapshots.

## Checks

### 1) Local project config (.regressionproof.json)
**What to check**
- Does `.regressionproof.json` exist in the current working directory?

**If missing**
- Suggest: `npx regressionproof init`

**Why**
- The Jest reporter reads `.regressionproof.json` from the current working directory.
- If it’s missing, the reporter falls back to the git remote name and often fails to find credentials.

---

### 2) Jest reporter configured
**What to check**
- `@regressionproof/jest-reporter` is installed (dependency or devDependency).
- Jest is configured to include the reporter in one of:
  - `package.json` → `jest.reporters`
  - `jest.config.js`
  - `jest.config.ts`

**If missing**
- Suggest `npx regressionproof init` or manual Jest reporter configuration.

**Why**
- Without the reporter, snapshots never run.

---

### 3) Credentials exist for the resolved project
**What to check**
- `~/.regressionproof/<project>/config.json` exists and contains `remote.url` + `remote.token`.

**If missing**
- Suggest:
  - **Teammate**: `npx regressionproof invite accept <token>`
  - **Owner (new project)**: `npx regressionproof init`

**Why**
- The “invite required” error is thrown when credentials can’t be loaded.

---

### 4) Mirror directory & remote access
**What to check**
- `~/.regressionproof/<project>/mirror` exists.
- If it exists, verify it can reach the remote with credentials.
  - Pull check: `git ls-remote <authed-url>`
  - Push check: `git -C <mirror> push --dry-run <authed-url> HEAD`

**If mirror is missing**
- Warn, but note it may be created on the first snapshot.

**If remote access fails**
- Suggest `npx regressionproof invite accept <token>` or re-init to refresh credentials.

**Why**
- The snapshotter needs to push to the remote to complete a snapshot.

---

## Output Expectations

- Each check should be labeled **OK / WARN / FAIL**.
- Each failure should include a single actionable fix.

## Usage

```bash
regressionproof doctor
regressionproof doctor --json
regressionproof doctor --cwd /path/to/project
```
## Implementation Checklist

- [x] Check for `.regressionproof.json` in the current working directory
- [x] Verify Jest reporter installed and configured
- [x] Verify credentials at `~/.regressionproof/<project>/config.json`
- [x] Verify mirror directory (local-only)
- [x] Verify mirror remote access
- [x] Output results as OK / WARN / FAIL with a single suggested fix

## Progress Notes

- Core doctor checks are implemented in the CLI (local-only mirror check so far).
- CLI wiring and human-readable output are done; JSON output is supported.
- Tests are deferred while we revisit the ESM/CJS test setup.
