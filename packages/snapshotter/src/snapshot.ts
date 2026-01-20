import {
    existsSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
} from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import { gitCommit, gitPush } from './git.js'
import { SnapshotOptions } from './snapshotter.types.js'
import { syncFiles } from './sync.js'

const ERROR_FILE_NAME = 'lastError.json'

class Snapshotter {
    private log = buildLog('Snapshotter')
    private queue: SnapshotOptions[] = []
    private isProcessing = false

    public snapshot(options: SnapshotOptions): void {
        this.checkForPreviousFailure(options.mirrorPath)
        this.enqueue(options)
    }

    private checkForPreviousFailure(mirrorPath: string): void {
        const errorPath = this.getErrorFilePath(mirrorPath)

        if (existsSync(errorPath)) {
            const errorData = JSON.parse(readFileSync(errorPath, 'utf-8'))
            unlinkSync(errorPath)

            throw new Error(
                `Previous snapshot failed: ${errorData.message}\n` +
                    `Timestamp: ${errorData.timestamp}\n` +
                    `This error was from a background snapshot that failed. ` +
                    `The snapshot has been retried - if this error persists, check your configuration.`
            )
        }
    }

    private enqueue(options: SnapshotOptions): void {
        this.queue.push(options)
        this.log.info('Snapshot queued', options.mirrorPath)
        void this.processQueue()
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return
        }

        this.isProcessing = true

        while (this.queue.length > 0) {
            const options = this.queue.shift()!
            await this.executeSnapshot(options)
        }

        this.isProcessing = false
    }

    private async executeSnapshot(options: SnapshotOptions): Promise<void> {
        const sourcePath = options.sourcePath ?? process.cwd()
        const { mirrorPath, testResults, remote } = options

        this.log.info('Starting snapshot', sourcePath, mirrorPath)

        try {
            await syncFiles(sourcePath, mirrorPath)
            this.log.info('Files synced', mirrorPath)

            const snapshotterDir = path.join(mirrorPath, '.snapshotter')
            mkdirSync(snapshotterDir, { recursive: true })
            writeFileSync(
                path.join(snapshotterDir, 'testResults.json'),
                JSON.stringify(sortTestResults(testResults), null, 2)
            )
            this.log.info('Test results saved', snapshotterDir)

            const committed = await gitCommit(mirrorPath, this.log)

            if (!committed) {
                this.log.info('No changes to commit', mirrorPath)
                this.clearError(mirrorPath)
                return
            }

            this.log.info('Commit created, pushing', remote.url)
            await gitPush(mirrorPath, remote, this.log)
            this.log.info('Push completed', remote.url)

            this.clearError(mirrorPath)
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.log.error(
                'Snapshot failed (will surface on next test run)',
                message
            )
            this.persistError(mirrorPath, err)
        }
    }

    private persistError(mirrorPath: string, err: unknown): void {
        const snapshotterDir = path.join(mirrorPath, '.snapshotter')
        mkdirSync(snapshotterDir, { recursive: true })

        const errorPath = this.getErrorFilePath(mirrorPath)
        const errorData = {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
        }

        writeFileSync(errorPath, JSON.stringify(errorData, null, 2))
    }

    private clearError(mirrorPath: string): void {
        const errorPath = this.getErrorFilePath(mirrorPath)

        if (existsSync(errorPath)) {
            unlinkSync(errorPath)
        }
    }

    private getErrorFilePath(mirrorPath: string): string {
        return path.join(mirrorPath, '.snapshotter', ERROR_FILE_NAME)
    }
}

const snapshotter = new Snapshotter()

export function snapshot(options: SnapshotOptions): void {
    snapshotter.snapshot(options)
}

function sortTestResults(
    testResults: SnapshotOptions['testResults']
): SnapshotOptions['testResults'] {
    const suites = [...testResults.suites].map((suite) => ({
        ...suite,
        tests: [...suite.tests].sort((left, right) =>
            left.name.localeCompare(right.name)
        ),
    }))
    suites.sort((left, right) => left.path.localeCompare(right.path))

    const typeErrors = testResults.typeErrors
        ? [...testResults.typeErrors].sort((left, right) => {
              const fileCompare = left.file.localeCompare(right.file)
              if (fileCompare !== 0) {
                  return fileCompare
              }
              const lineCompare = left.line - right.line
              if (lineCompare !== 0) {
                  return lineCompare
              }
              return left.column - right.column
          })
        : undefined

    return {
        ...testResults,
        suites,
        typeErrors,
    }
}
