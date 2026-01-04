import { execSync } from 'child_process'

const CONTAINER_NAME = 'regressionproof-gitea-test'
const HTTP_PORT = 3334
const GITEA_URL = `http://localhost:${HTTP_PORT}`
const ADMIN_USER = 'testadmin'
const ADMIN_PASSWORD = 'testpassword123'
const ADMIN_EMAIL = 'admin@test.local'

export default async function globalSetup() {
    console.log('\n🚀 Starting Gitea for tests...')

    // Stop and remove existing test container if it exists (including volumes)
    try {
        execSync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`, {
            stdio: 'pipe',
        })
        execSync(`docker rm -v ${CONTAINER_NAME} 2>/dev/null || true`, {
            stdio: 'pipe',
        })
    } catch {
        // Ignore errors
    }

    // Start fresh Gitea container
    execSync(
        `docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${HTTP_PORT}:3000 \
        -e GITEA__security__INSTALL_LOCK=true \
        -e GITEA__server__ROOT_URL=${GITEA_URL} \
        -e GITEA__server__HTTP_PORT=3000 \
        gitea/gitea:latest`,
        { stdio: 'pipe' }
    )

    // Wait for Gitea to be ready
    await waitForGitea()

    // Create admin user (with retries since DB may not be fully ready)
    await createAdminUser()

    // Write .env file for tests (globalSetup runs in separate process)
    const fs = await import('fs')
    const path = await import('path')
    const envPath = path.resolve(__dirname, '../.env')
    fs.writeFileSync(
        envPath,
        `GITEA_URL=${GITEA_URL}
GITEA_ADMIN_USER=${ADMIN_USER}
GITEA_ADMIN_PASSWORD=${ADMIN_PASSWORD}
`
    )

    console.log(`✅ Gitea ready at ${GITEA_URL}`)
}

async function createAdminUser(maxAttempts = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            execSync(
                `docker exec --user git ${CONTAINER_NAME} gitea admin user create \
                --username ${ADMIN_USER} \
                --password ${ADMIN_PASSWORD} \
                --email ${ADMIN_EMAIL} \
                --admin`,
                { stdio: 'pipe' }
            )
            return
        } catch {
            // Database might not be ready, wait and retry
            await sleep(1000)
        }
    }
    throw new Error('Failed to create admin user')
}

async function waitForGitea(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(`${GITEA_URL}/api/v1/version`)
            if (response.ok) {
                return
            }
        } catch {
            // Not ready yet
        }
        await sleep(1000)
    }
    throw new Error('Gitea failed to start')
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
