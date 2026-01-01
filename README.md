# Project Snapshotter

## Purpose / Vision

A TypeScript tool for capturing code evolution through the TDD cycle, with the ultimate goal of generating training data for LLMs (possibly for fine-tuning).

### Core Concept

- Programmatic library imported by Spruce CLI
- Called directly after each test run (no CLI/subprocess overhead)
- Syncs source code to an isolated mirror directory
- Commits code + test metadata together, building a git history of TDD progression
- This history becomes training data for LLMs

### Key Advantage

Controlled environment (Spruce CLI) means we can make assumptions about project structure, test runners, output formats, etc.

## Architecture Decisions

### What is a "Snapshot"?

A snapshot is:

1. **Sync source files** to a mirror directory using rsync
   - If source has `.gitignore`: use `git ls-files --cached --others --exclude-standard` to get file list and pipe to rsync
   - If no `.gitignore`: rsync with sensible defaults (exclude `node_modules`, `build`)

2. **Git commit** in the mirror directory's own isolated repo
   - Captures the diff from previous state
   - Full history preserved for reconstruction
   - Completely isolated from the developer's repo/workflow

3. **Include metadata** in the commit (at `.snapshotter/metadata.json`)
   - Each commit contains both code state AND test results
   - Enables correlation when extracting training data later

### How Do We Trigger Snapshots?

Spruce CLI imports this package and calls `snapshot()` directly after each completed test run. No watcher/daemon needed - simpler and more reliable.

**Flow:**
1. Test run completes
2. Spruce CLI writes metadata to a staging location
3. Spruce CLI calls `await snapshot({ ... })`
4. Snapshotter syncs source files to mirror directory
5. Snapshotter copies metadata into mirror (at `.snapshotter/metadata.json`)
6. Snapshotter commits everything together
7. Function returns

- **Frequency**: Every completed test run
- **Deduplication**: Handled naturally by git - if no code changed since last snapshot, nothing to commit

This is a clean separation of concerns:
- **Spruce CLI**: knows about tests, writes metadata, calls snapshot()
- **Snapshotter**: handles syncing, committing, history management

### Git Hosting & Remote Push

Snapshots are pushed to a self-hosted **Gitea** instance after each commit. This gives us full control over authentication and makes training data collection easy.

**Why Gitea:**
- Lightweight, easy to deploy (single binary or Docker)
- Full API for creating repos and tokens
- Self-hosted = full control, no third-party dependencies
- All training data in one place under one admin account

**Architecture:**

```
Developer's machine          Our infrastructure
┌─────────────────┐         ┌─────────────────┐
│  Spruce CLI     │         │  Snapshot API   │
│       ↓         │         │  (creates repos │
│  Snapshotter    │ ←────── │   and tokens)   │
│       ↓         │         └────────┬────────┘
│  Push to Gitea  │ ──────────────→  │
└─────────────────┘         ┌────────▼────────┐
                            │     Gitea       │
                            │  (self-hosted)  │
                            └─────────────────┘
```

**Snapshot API:**
- Hosted alongside Gitea
- Holds the Gitea admin token securely (never exposed to developers)
- Developers call it to register a project
- Creates a repo under the admin account
- Generates a scoped token for that repo
- Returns `{ repoUrl, token }` to the developer

**Flow:**
1. Developer calls Snapshot API to register project → gets `repoUrl` + `token`
2. Snapshotter configured with these credentials
3. After each snapshot commit, snapshotter pushes to Gitea
4. All repos live under admin account for easy training data access

**Local Development:**
```bash
# Boot local Gitea for testing
./boot-git.sh
# Opens at http://localhost:3333
```

### Metadata File Format

The metadata file is JSON, written by Spruce CLI on every completed test run. It gets copied into the mirror directory at `.snapshotter/metadata.json` and committed alongside the code, so each commit has both the code state and the test results that triggered it.

#### Schema

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
| `suites[].tests[].error` | string | Full error message + callstack (only present if failed). Paths in callstack should also be relative to project root. |

#### Example

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
          "error": "Expected true but got false\n    at Object.<anonymous> (src/__tests__/UserService.test.ts:45:10)\n    at Promise.then.completed (node_modules/jest-circus/build/utils.js:293:28)"
        }
      ]
    },
    {
      "path": "src/__tests__/AuthController.test.ts",
      "passed": true,
      "tests": [
        {
          "name": "should authenticate user",
          "passed": true
        },
        {
          "name": "should reject invalid token",
          "passed": true
        }
      ]
    }
  ]
}
```

## Usage

### Installation

```bash
yarn add project-snapshotter
```

### API

```typescript
import { snapshot } from 'project-snapshotter'

await snapshot({
  source: '/path/to/project',  // optional, defaults to process.cwd()
  mirror: '/path/to/mirror',   // required
  metadata: '/tmp/test-results.json',  // required
  remote: {
    url: 'http://localhost:3333/admin/my-project.git',
    token: 'gitea-token-here'
  }
})
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `source` | No | `process.cwd()` | Source project path to sync from |
| `mirror` | Yes | - | Mirror directory path (where the isolated git repo lives) |
| `metadata` | Yes | - | Path to metadata JSON file written by Spruce CLI |
| `remote.url` | Yes | - | Gitea repo URL to push to |
| `remote.token` | Yes | - | Gitea access token for authentication |

### What Happens

1. Syncs source files to mirror directory (respects `.gitignore` if present, otherwise excludes `node_modules`, `build`)
2. Copies metadata file to `.snapshotter/metadata.json` in mirror
3. Commits all changes to the mirror's git repo
4. Pushes to remote Gitea repo
5. If no changes since last snapshot, no commit/push is made

## Security / Privacy

Snapshots are intended to become LLM training data, so we take care to avoid capturing sensitive information.

### File Exclusions

1. **Honor `.gitignore`** - If the source project has a `.gitignore`, we respect it via `git ls-files`

2. **Default exclusions** - These patterns are always excluded, regardless of `.gitignore`:
   - `*.env*` - Environment files
   - `*.pem` - Certificates
   - `*.key` - Private keys
   - `*.p12` - PKCS12 keystores
   - `*.pfx` - PKCS12 keystores
   - `*credentials*` - Credential files
   - `*secret*` - Secret files
   - `.env*` - Dotenv files
   - `*.local` - Local config overrides

### Developer Responsibility

The developer is ultimately responsible for:
- Maintaining a proper `.gitignore`
- Not hardcoding secrets in source files
- Reviewing what gets captured if working with sensitive data
