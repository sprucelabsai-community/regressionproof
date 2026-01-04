import { execSync } from 'child_process'
import fs from 'fs'

const CONTAINER_NAME = 'regressionproof-gitea-test'

export default async function globalTeardown() {
    console.log('\n🛑 Stopping Gitea...')

    try {
        execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'pipe' })
        execSync(`docker rm -v ${CONTAINER_NAME}`, { stdio: 'pipe' })
    } catch {
        // Ignore errors if container doesn't exist
    }

    // Clean up config file
    try {
        fs.unlinkSync('/tmp/regressionproof-gitea-config.json')
    } catch {
        // Ignore if doesn't exist
    }

    console.log('✅ Gitea stopped')
}
