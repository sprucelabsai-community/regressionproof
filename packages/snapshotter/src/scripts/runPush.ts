import { existsSync, unlinkSync, writeFileSync } from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import ErrorHandler from '../components/ErrorHandler.js'
import { gitPush } from '../git.js'
import type { RemoteOptions } from '../snapshotter.types.js'
import SnapshotterState from '../utilities/SnapshotterState.js'

const LOCK_FILE_NAME = 'push.lock'
const PENDING_FILE_NAME = 'push.pending'
const log = buildLog('Snapshotter')

async function main() {
    const mirrorPath = getEnvOrExit('MIRROR_PATH')
    const remoteUrl = getEnvOrExit('REMOTE_URL')
    const remoteToken = getEnvOrExit('REMOTE_TOKEN')

    const stateDir = SnapshotterState.EnsureStateDir(mirrorPath)

    const lockPath = path.join(stateDir, LOCK_FILE_NAME)
    const pendingPath = path.join(stateDir, PENDING_FILE_NAME)

    if (existsSync(lockPath)) {
        writeFileSync(pendingPath, new Date().toISOString())
        log.info('Push already running, marked pending', mirrorPath)
        return
    }

    try {
        writeFileSync(lockPath, process.pid.toString())

        const remote: RemoteOptions = {
            url: remoteUrl,
            token: remoteToken,
        }

        await processLoop(mirrorPath, remote, pendingPath)
    } finally {
        if (existsSync(lockPath)) {
            unlinkSync(lockPath)
        }
    }
}

async function processLoop(
    mirrorPath: string,
    remote: RemoteOptions,
    pendingPath: string
): Promise<void> {
    while (true) {
        if (existsSync(pendingPath)) {
            unlinkSync(pendingPath)
        }

        try {
            log.info('Push starting', remote.url)
            await gitPush(mirrorPath, remote, log)
            log.info('Push completed', remote.url)
            ErrorHandler.Handler().clearError(mirrorPath)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            log.error('Push failed', message)
            ErrorHandler.Handler().persistError(mirrorPath, err)
            writeFileSync(pendingPath, new Date().toISOString())
            return
        }

        if (!existsSync(pendingPath)) {
            return
        }
    }
}

function getEnvOrExit(name: string): string {
    const value = process.env[name]
    if (!value) {
        console.error(`Missing required env var: ${name}`)
        process.exit(1)
    }
    return value
}

main().catch((err) => {
    console.error('Push script failed:', err)
    process.exit(1)
})
