import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { TestResults } from '../snapshotter.types.js'

export default class TestResultsWriter {
    private constructor() {}

    public static Writer(): TestResultsWriter {
        return new this()
    }

    public write(mirrorPath: string, testResults: TestResults): void {
        const snapshotterDir = path.join(mirrorPath, '.snapshotter')
        mkdirSync(snapshotterDir, { recursive: true })

        const sorted = this.sortTestResults(testResults)
        writeFileSync(
            path.join(snapshotterDir, 'testResults.json'),
            JSON.stringify(sorted, null, 2)
        )
    }

    private sortTestResults(testResults: TestResults): TestResults {
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
}
