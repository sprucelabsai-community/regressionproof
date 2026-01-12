#!/bin/bash

# E2E local development setup
# Reentrant - safe to run multiple times
#
# Sets up everything needed to test regressionproof in another local project:
#   1. Builds all packages
#   2. Boots Gitea + creates admin user
#   3. Links CLI + jest-reporter globally
#   4. Starts API (foreground, Ctrl+C to stop)
#
# After running this, in another terminal go to your test project and run:
#   yarn link @regressionproof/cli @regressionproof/jest-reporter
#   npx regressionproof init
#   yarn test

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

clear
echo "==> Building packages..."
echo ""
yarn build

clear
# 2. Boot infrastructure (Gitea + admin + .env) - source to get exported vars
source "${SCRIPT_DIR}/boot-infra.sh"

# 3. Link packages globally (reentrant)
clear
echo "==> Linking packages globally..."
cd "${ROOT_DIR}/packages/cli"
yarn link 2>/dev/null || true
cd "${ROOT_DIR}/packages/jest-reporter"
yarn link 2>/dev/null || true
cd "$ROOT_DIR"
echo "    @regressionproof/cli linked"
echo "    @regressionproof/jest-reporter linked"

# 4. Check if API port is available
check_port "${API_PORT}" "API"

echo ""
echo "==> Starting API server..."

# Start API in background, capture logs
cd "${ROOT_DIR}/packages/api"
yarn serve > "${ROOT_DIR}/api.log" 2>&1 &
API_PID=$!
cd "$ROOT_DIR"

# Wait for API to be ready
echo "    Waiting for API..."
API_READY=false
for i in {1..15}; do
    if curl -s "http://localhost:${API_PORT}/check-name/test" > /dev/null 2>&1; then
        API_READY=true
        break
    fi
    # Check if process died
    if ! kill -0 $API_PID 2>/dev/null; then
        echo ""
        echo "ERROR: API failed to start"
        echo ""
        cat "${ROOT_DIR}/api.log"
        exit 1
    fi
    sleep 1
done

if [ "$API_READY" = false ]; then
    echo ""
    echo "ERROR: API failed to respond after 15 seconds"
    echo ""
    cat "${ROOT_DIR}/api.log"
    kill $API_PID 2>/dev/null || true
    exit 1
fi

# Success!
clear
echo ""
echo "=============================================="
echo "  regressionproof.ai running locally!"
echo "=============================================="
echo ""
echo "  Gitea:  ${GITEA_URL} (${ADMIN_USER}/${ADMIN_PASSWORD})"
echo "  API:    http://localhost:${API_PORT}"
echo ""
echo "  In another terminal, go to your test project and run:"
echo ""
echo "    yarn link @regressionproof/cli @regressionproof/jest-reporter"
echo "    printf '\\nREGRESSIONPROOF_API_URL=http://localhost:${API_PORT}\\n' >> .env"
echo "    npx regressionproof init"
echo "    yarn test"
echo ""
echo "  Then check Gitea for your snapshot!"
echo ""
echo "  Logs: ${ROOT_DIR}/api.log"
echo "  Ctrl+C to stop"
echo ""

# Handle Ctrl+C - kill API
trap "kill $API_PID 2>/dev/null; exit 0" INT TERM

# Wait for API to exit
wait $API_PID
