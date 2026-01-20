import { buildLog } from '@sprucelabs/spruce-skill-utils'
import ErrorHandler from '../components/ErrorHandler.js'
import FileSyncer from '../components/FileSyncer.js'
import TestResultsWriter from '../components/TestResultsWriter.js'
import { gitCommit, gitPush } from '../git.js'
import { SnapshotOptions } from '../snapshotter.types.js'
import SnapshotStrategy from './SnapshotStrategy.js'

export default class SyncStrategy implements SnapshotStrategy {
    private log = buildLog('Snapshotter')

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
            this.log.info('Files synced', mirrorPath)

            TestResultsWriter.Writer().write(mirrorPath, testResults)
            this.log.info('Test results saved', mirrorPath)

            const committed = await gitCommit(mirrorPath, this.log)

            if (!committed) {
                this.log.info('No changes to commit', mirrorPath)
                ErrorHandler.Handler().clearError(mirrorPath)
                return
            }

            this.log.info('Commit created, pushing', remote.url)
            await gitPush(mirrorPath, remote, this.log)
            this.log.info('Push completed', remote.url)

            ErrorHandler.Handler().clearError(mirrorPath)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.log.error('Snapshot failed', message)
            ErrorHandler.Handler().persistError(mirrorPath, err)
            throw err
        }
    }
}
