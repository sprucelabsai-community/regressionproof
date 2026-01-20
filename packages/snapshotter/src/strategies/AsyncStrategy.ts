import { spawn } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import { SnapshotOptions } from '../snapshotter.types.js'
import SnapshotStrategy from './SnapshotStrategy.js'

export default class AsyncStrategy implements SnapshotStrategy {
    private log = buildLog('Snapshotter')
    private scriptPath = path.join(__dirname, '..', 'scripts', 'runSnapshot.js')

    private constructor() {}

    public static Strategy(): AsyncStrategy {
        return new this()
    }

    public execute(options: SnapshotOptions): void {
        const snapshotterDir = this.writeOptionsFile(options)
        this.spawnSnapshotProcess(snapshotterDir)

        this.log.info(
            'Snapshot queued (running in background)',
            options.mirrorPath
        )
    }

    private writeOptionsFile(options: SnapshotOptions): string {
        const snapshotterDir = path.join(options.mirrorPath, '.snapshotter')
        mkdirSync(snapshotterDir, { recursive: true })

        const optionsPath = path.join(snapshotterDir, 'pending.json')
        writeFileSync(optionsPath, JSON.stringify(options, null, 2))

        return snapshotterDir
    }

    private spawnSnapshotProcess(snapshotterDir: string): void {
        const child = spawn('node', [this.scriptPath, snapshotterDir], {
            detached: true,
            stdio: 'ignore',
        })

        child.unref()
    }
}
