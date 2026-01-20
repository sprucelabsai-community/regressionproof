import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import ErrorHandler from '../components/ErrorHandler.js'
import { SnapshotOptions } from '../snapshotter.types.js'
import SyncStrategy from '../strategies/SyncStrategy.js'

const LOCK_FILE_NAME = 'snapshot.lock'
const PENDING_FILE_NAME = 'pending.json'
const log = buildLog('Snapshotter')

async function main() {
    const stateDir = process.argv[2]

    if (!stateDir) {
        console.error('Usage: runSnapshot <state-dir>')
        process.exit(1)
    }

    const lockPath = path.join(stateDir, LOCK_FILE_NAME)

    if (existsSync(lockPath)) {
        log.info('Another snapshot is running, exiting')
        process.exit(0)
    }

    try {
        writeFileSync(lockPath, process.pid.toString())
        await processLoop(stateDir)
    } finally {
        if (existsSync(lockPath)) {
            unlinkSync(lockPath)
        }
    }
}

async function processLoop(stateDir: string): Promise<void> {
    const pendingPath = path.join(stateDir, PENDING_FILE_NAME)

    while (existsSync(pendingPath)) {
        const options: SnapshotOptions = JSON.parse(
            readFileSync(pendingPath, 'utf-8')
        )

        unlinkSync(pendingPath)

        await executeSnapshot(options)
    }
}

async function executeSnapshot(options: SnapshotOptions): Promise<void> {
    try {
        await SyncStrategy.Strategy().execute(options)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error('Snapshot failed (will surface on next test run)', message)
        ErrorHandler.Handler().persistError(options.mirrorPath, err)
    }
}

main().catch((err) => {
    console.error('Snapshot script failed:', err)
    process.exit(1)
})
