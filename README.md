# regressionproof

Capture your TDD workflow to help train AI coding agents. Each test run creates a snapshot of your code + test results, building a history that becomes LLM training data.

## Quick Start

### 1. Install

```bash
yarn add -D @regressionproof/cli @regressionproof/jest-reporter
```

### 2. Initialize

```bash
npx regressionproof init
```

This will:
- Register your project
- Save credentials to `~/.regressionproof/<project-name>/`
- Auto-configure Jest to use the reporter

### 3. Run Tests

```bash
yarn test
```

That's it! Snapshots are captured automatically after each test run.

## How It Works

1. **Test run completes** - Jest reporter captures results
2. **Code synced** - Source files mirrored to `~/.regressionproof/<project>/mirror/`
3. **Snapshot committed** - Code + test results committed together
4. **Pushed to remote** - Snapshot pushed to our infrastructure

Each commit contains both code state AND test results, enabling correlation for training data extraction.

## Manual Jest Setup

If auto-configuration didn't work, add the reporter manually:

```javascript
// jest.config.js
module.exports = {
  reporters: ['default', '@regressionproof/jest-reporter']
}
```

## Configuration

Credentials are stored in your home directory:

```
~/.regressionproof/<project-name>/
  config.json    # credentials
  mirror/        # git mirror
```

This keeps your project directory clean and avoids accidentally committing credentials.

## Security

Snapshots exclude sensitive files by default:
- `node_modules`, `build`
- `*.env*`, `*.pem`, `*.key`
- `*credentials*`, `*secret*`

Your `.gitignore` is also respected.

## Local Development

For contributors working on regressionproof itself.

### Prerequisites

- Docker
- Node.js 18+
- Yarn

### Quick Start

```bash
yarn install
yarn build
yarn setup.e2e   # Boots Gitea + API, links packages
```

### Testing Against Local Projects

**Terminal 1** (regressionproof repo):
```bash
yarn setup.e2e
```

**Terminal 2** (your test project):
```bash
yarn link @regressionproof/cli @regressionproof/jest-reporter
echo 'REGRESSIONPROOF_API_URL=http://localhost:3000' >> .env
npx regressionproof init
yarn test
```

Check http://localhost:3333 for snapshots (admin / devpassword123).

### Scripts

| Script | Description |
|--------|-------------|
| `yarn build` | Build all packages |
| `yarn test` | Run tests |
| `yarn dev` | Boot Gitea + API |
| `yarn setup.e2e` | Full E2E setup with package linking |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITEA_PORT` | `3333` | Gitea HTTP port |
| `API_PORT` | `3000` | API server port |
| `ADMIN_USER` | `admin` | Gitea admin username |
| `ADMIN_PASSWORD` | `devpassword123` | Gitea admin password |
