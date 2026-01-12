# Architecture & Technical Details

Detailed technical documentation for contributors and maintainers.

## What is a "Snapshot"?

A snapshot is:

1. **Sync source files** to a mirror directory using rsync
   - If source has `.gitignore`: use `git ls-files` to respect it, plus security exclusions
   - If no `.gitignore`: use security exclusions only

2. **Git commit** in the mirror directory's own isolated repo
   - Captures the diff from previous state
   - Full history preserved for reconstruction
   - Completely isolated from the developer's repo/workflow

3. **Include test results** in the commit (at `.snapshotter/testResults.json`)
   - Each commit contains both code state AND test results
   - Enables correlation when extracting training data later

4. **Push to remote** Gitea instance

## How Do We Trigger Snapshots?

Test runner integrations (e.g., Jest reporter) call `snapshot()` directly after each completed test run. No watcher/daemon needed - simpler and more reliable.

**Flow:**
1. Test run completes
2. Reporter collects test results
3. Reporter calls `await snapshot({ testResults, ... })`
4. Snapshotter syncs source files to mirror directory
5. Snapshotter writes test results to mirror (at `.snapshotter/testResults.json`)
6. Snapshotter commits everything together
7. Snapshotter pushes to remote Gitea
8. Function returns

- **Frequency**: Every completed test run
- **Deduplication**: Handled naturally by git - if no code changed since last snapshot, nothing to commit

## Git Hosting & Remote Push

Snapshots are pushed to a self-hosted **Gitea** instance after each commit.

**Why Gitea:**
- Lightweight, easy to deploy (single binary or Docker)
- Full API for creating repos and tokens
- Self-hosted = full control, no third-party dependencies
- All training data in one place under one admin account

**Architecture:**

```
Developer's machine                Our infrastructure
┌──────────────────────┐          ┌─────────────────┐
│  regressionproof     │          │  Snapshot API   │
│  init (CLI)          │ ──────── │  (creates repos │
│    ↓                 │ ←─────── │   and tokens)   │
│  (saves credentials) │          └────────┬────────┘
│                      │                   │
│  Test Runner         │          ┌────────▼────────┐
│  + Reporter          │ ───────→ │     Gitea       │
│    ↓                 │          │  (self-hosted)  │
│  Snapshotter → Push  │          └─────────────────┘
└──────────────────────┘
```

**Snapshot API**:
- Hosted alongside Gitea
- Holds the Gitea admin token securely (never exposed to developers)
- `regressionproof init` CLI calls it to register a project
- Creates a repo under the admin account
- Generates a scoped token for that repo
- Returns `{ url, token }` which are saved locally

## Test Results Format

Test results are passed by the test runner reporter as an object on every completed test run. The snapshotter writes them to `.snapshotter/testResults.json` in the mirror directory.

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO 8601 timestamp of when test run completed |
| `summary.totalSuites` | number | Total number of test suites (files) |
| `summary.passedSuites` | number | Number of suites with all tests passing |
| `summary.failedSuites` | number | Number of suites with at least one failure |
| `summary.totalTests` | number | Total number of individual tests |
| `summary.passedTests` | number | Number of passing tests |
| `summary.failedTests` | number | Number of failing tests |
| `suites` | array | Array of suite objects |
| `suites[].path` | string | Path to test file, **relative to project root** |
| `suites[].passed` | boolean | Whether all tests in suite passed |
| `suites[].tests` | array | Array of test objects |
| `suites[].tests[].name` | string | Name of the individual test |
| `suites[].tests[].passed` | boolean | Whether this test passed |
| `suites[].tests[].error` | string | Full error message + callstack (only present if failed) |

### Example

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "summary": {
    "totalSuites": 5,
    "passedSuites": 4,
    "failedSuites": 1,
    "totalTests": 42,
    "passedTests": 41,
    "failedTests": 1
  },
  "suites": [
    {
      "path": "src/__tests__/UserService.test.ts",
      "passed": false,
      "tests": [
        {
          "name": "should create a user",
          "passed": true
        },
        {
          "name": "should validate email",
          "passed": false,
          "error": "Expected true but got false\n    at Object.<anonymous> (src/__tests__/UserService.test.ts:45:10)"
        }
      ]
    }
  ]
}
```

## Snapshotter API

```typescript
import { snapshot } from '@regressionproof/snapshotter'

await snapshot({
  sourcePath: '/path/to/project',  // optional, defaults to process.cwd()
  mirrorPath: '/path/to/mirror',   // required
  testResults: { ... },            // required - see Test Results Format
  remote: {
    url: 'http://gitea.example.com/admin/my-project.git',
    token: 'gitea-token-here'
  }
})
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `sourcePath` | No | `process.cwd()` | Source project path to sync from |
| `mirrorPath` | Yes | - | Mirror directory path |
| `testResults` | Yes | - | Test results object |
| `remote.url` | Yes | - | Gitea repo URL to push to |
| `remote.token` | Yes | - | Gitea access token |

## Security / Privacy Details

### File Exclusions

1. **Honor `.gitignore`** - If the source project has a `.gitignore`, we respect it via `git ls-files`

2. **Default exclusions** - Always excluded regardless of `.gitignore`:
   - `node_modules` - Dependencies
   - `build` - Build artifacts
   - `*.env*` - Environment files
   - `*.pem` - Certificates
   - `*.key` - Private keys
   - `*.p12` - PKCS12 keystores
   - `*.pfx` - PKCS12 keystores
   - `*credentials*` - Credential files
   - `*secret*` - Secret files
   - `*.local` - Local config overrides

## Package Overview

| Package | Description |
|---------|-------------|
| `@regressionproof/snapshotter` | Core snapshot library |
| `@regressionproof/api` | Project registration API |
| `@regressionproof/client` | API client |
| `@regressionproof/cli` | CLI for project initialization |
| `@regressionproof/jest-reporter` | Jest integration |

## Architecture Decisions

- **Config/mirror in home directory** - `~/.regressionproof/<project-name>/` keeps project clean, survives clones, avoids credential leaks
- **Auto-modify jest config** - `regressionproof init` automatically adds the reporter
- **Project name from git remote** - Extracts repo name from `git remote get-url origin`, converts to slug
- **Direct reporter integration** - No daemon/watcher needed, reporter calls snapshotter directly

## Implementation Status

All core packages are complete and tested.

- [x] `@regressionproof/snapshotter` - Core snapshot library
- [x] `@regressionproof/api` - Project registration API
- [x] `@regressionproof/client` - API client
- [x] `@regressionproof/cli` - CLI with full init flow
- [x] `@regressionproof/jest-reporter` - Jest integration

### Jest Reporter Details

- [x] Package setup (ESM, workspace integrated)
- [x] Reporter class with Jest hooks (`onRunStart`, `onTestStart`, `onRunComplete`)
- [x] Transform Jest `AggregatedResult` → our `TestResults` format
- [x] Load config from `.regressionproof.json` or git remote
- [x] Call snapshotter in `onRunComplete`
- [x] Graceful error handling (logs instead of crashing test runs)

### CLI Init Flow

The `regressionproof init` command:
1. Registers project - Calls API to create Gitea repo and get credentials
2. Stores credentials - Saves to `~/.regressionproof/<project-name>/config.json`
3. Auto-configures Jest - Adds reporter to `package.json`, `jest.config.ts`, or `jest.config.js`

## Future Work

- [ ] Vitest reporter
- [ ] Mocha reporter
- [ ] Other languages (Python, Go)
- [ ] Dashboard/analytics
- [ ] Training data extraction tools
