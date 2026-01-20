import { spawn } from 'child_process'
import { writeFileSync } from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import { SnapshotOptions } from '../snapshotter.types.js'
import SnapshotterState from '../utilities/SnapshotterState.js'
import SnapshotStrategy from './SnapshotStrategy.js'

export default class AsyncStrategy implements SnapshotStrategy {
    private log = buildLog('Snapshotter')
    private scriptPath = path.join(__dirname, '..', 'scripts', 'runSnapshot.js')

    private constructor() {}

    public static Strategy(): AsyncStrategy {
        return new this()
    }

    public execute(options: SnapshotOptions): void {
        const stateDir = this.writeOptionsFile(options)
        this.spawnSnapshotProcess(stateDir)

        this.log.info(
            'Snapshot queued (running in background)',
            options.mirrorPath
        )
    }

    private writeOptionsFile(options: SnapshotOptions): string {
        const stateDir = SnapshotterState.EnsureStateDir(options.mirrorPath)
        const optionsPath = path.join(stateDir, 'pending.json')
        writeFileSync(optionsPath, JSON.stringify(options, null, 2))

        return stateDir
    }

    private spawnSnapshotProcess(stateDir: string): void {
        const child = spawn('node', [this.scriptPath, stateDir], {
            detached: true,
            stdio: 'ignore',
        })

        child.unref()
    }
}
