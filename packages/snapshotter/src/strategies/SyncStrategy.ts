import { spawn } from 'child_process'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import ErrorHandler from '../components/ErrorHandler.js'
import FileSyncer from '../components/FileSyncer.js'
import TestResultsWriter from '../components/TestResultsWriter.js'
import { gitCommit } from '../git.js'
import { SnapshotOptions } from '../snapshotter.types.js'
import SnapshotterState from '../utilities/SnapshotterState.js'
import SnapshotStrategy from './SnapshotStrategy.js'

export default class SyncStrategy implements SnapshotStrategy {
    private log = buildLog('Snapshotter')
    private pushScriptPath = path.join(__dirname, '..', 'scripts', 'runPush.js')

    private constructor() {}

    public static Strategy(): SyncStrategy {
        return new this()
    }

    public async execute(options: SnapshotOptions): Promise<void> {
        const sourcePath = options.sourcePath ?? process.cwd()
        const { mirrorPath, testResults, remote } = options

        this.log.info('Starting snapshot', sourcePath, mirrorPath)

        try {
            await FileSyncer.Syncer().sync(sourcePath, mirrorPath)
            SnapshotterState.CleanupLegacyMirrorState(mirrorPath)
            this.log.info('Files synced', mirrorPath)

            TestResultsWriter.Writer().write(mirrorPath, testResults)
            this.log.info('Test results saved', mirrorPath)

            const committed = await gitCommit(mirrorPath, this.log)

            if (!committed) {
                this.log.info('No changes to commit', mirrorPath)
                ErrorHandler.Handler().clearError(mirrorPath)
                return
            }

            this.log.info('Commit created, queueing push', remote.url)
            this.spawnPushProcess(mirrorPath, remote)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.log.error('Snapshot failed', message)
            ErrorHandler.Handler().persistError(mirrorPath, err)
            throw err
        }
    }

    private spawnPushProcess(
        mirrorPath: string,
        remote: SnapshotOptions['remote']
    ): void {
        const child = spawn('node', [this.pushScriptPath], {
            detached: true,
            stdio: 'ignore',
            env: {
                ...process.env,
                MIRROR_PATH: mirrorPath,
                REMOTE_URL: remote.url,
                REMOTE_TOKEN: remote.token,
            },
        })

        child.unref()
    }
}
