# regressionproof

Capture your TDD workflow to help train AI coding agents. Each test run creates a snapshot of your code + test results, building a history that becomes LLM training data.

## Quick Start

**Currently supported:** Jest on Node.js. Need another framework or language? [Request it here.](https://github.com/sprucelabsai-community/regressionproof/issues/new?title=Framework%20Request:%20&labels=enhancement)

### 1. Initialize

```bash
npx regressionproof init
```

This will:
- Register your project
- Save credentials to `~/.regressionproof/<project-name>/`
- Install `@regressionproof/jest-reporter` in your project
- Auto-configure Jest to use the reporter

### 2. Run Tests

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

After updating your Jest config, rerun:

```bash
npx regressionproof init
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
- Node.js 20+
- Yarn

### Quick Start

```bash
yarn install
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

## Deploy (EC2)

Follow these steps in order:

1. **DNS records** (Cloudflare → DNS):
   - `api` → EC2 public IP (A record, proxied)
   - `git` → EC2 public IP (A record, proxied)
2. **SSL/TLS mode** (Cloudflare → SSL/TLS): set to **Full (strict)**.
3. **Origin cert** (Cloudflare → SSL/TLS → Origin Server):
   - Create an Origin Certificate for `api.<your-domain>` and `git.<your-domain>`.
   - Save the cert + key on the EC2 instance:

```
~/regressionproof/nginx/certs/origin.pem
~/regressionproof/nginx/certs/origin.key
```

4. **Bootstrap the API + Gitea stack**:

Use a local file so interactive prompts work correctly.

```bash
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/master/scripts/deploy-ec2.sh -o /tmp/deploy-ec2.sh
bash /tmp/deploy-ec2.sh
```

**Reset the stack (optional):**

```bash
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/master/scripts/reset-ec2.sh -o /tmp/reset-ec2.sh
bash /tmp/reset-ec2.sh
```

To see available options, run:

```bash
bash scripts/deploy-ec2.sh --help
```

To customize domains, set env vars before running the script:

```bash
API_DOMAIN=api.<your-domain> \
GIT_DOMAIN=git.<your-domain> \
curl -fsSL https://raw.githubusercontent.com/sprucelabsai-community/regressionproof/master/scripts/deploy-ec2.sh | bash
```
