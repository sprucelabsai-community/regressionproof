import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { buildLog } from '@sprucelabs/spruce-skill-utils'
import { gitCommit, gitPush } from './git.js'
import { SnapshotOptions } from './snapshotter.types.js'
import { syncFiles } from './sync.js'

class Snapshotter {
    private log = buildLog('Snapshotter')

    public async snapshot(options: SnapshotOptions): Promise<boolean> {
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
                return false
            }

            this.log.info('Commit created, pushing', remote.url)
            await gitPush(mirrorPath, remote, this.log)
            this.log.info('Push completed', remote.url)

            return true
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            this.log.error('Snapshot failed', message)
            throw err
        }
    }
}

export async function snapshot(options: SnapshotOptions): Promise<boolean> {
    return new Snapshotter().snapshot(options)
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
