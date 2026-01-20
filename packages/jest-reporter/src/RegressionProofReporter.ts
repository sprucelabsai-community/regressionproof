import type {
    AggregatedResult,
    Reporter,
    ReporterOnStartOptions,
    Test,
    TestCaseResult,
    TestContext,
} from '@jest/reporters'
import { Snapshotter } from '@regressionproof/snapshotter'
import {
    loadConfig,
    detectProjectName,
    ReporterConfig,
} from './config/loadConfig.js'
import SpruceError from './errors/SpruceError.js'
import { transformResults } from './transformers/transformResults.js'
import { captureTypeErrors } from './utilities/captureTypeErrors.js'
import { getPackageVersion } from './utilities/version.js'

export default class RegressionProofReporter implements Reporter {
    private cwd: string
    private isCi: boolean
    private config: ReporterConfig | null = null
    private snapshotter = Snapshotter.Snapshotter({ mode: 'sync' })

    public constructor(_globalConfig?: unknown, _reporterConfig?: unknown) {
        this.cwd = process.cwd()
        this.isCi = process.env.CI === 'true' || process.env.IS_CI === 'true'
    }

    public onRunStart(
        _results: AggregatedResult,
        _options: ReporterOnStartOptions
    ): void {
        if (this.isCi) {
            return
        }

        this.config = loadConfig(this.cwd)

        if (!this.config) {
            const projectName = detectProjectName(this.cwd) ?? 'unknown'
            throw new SpruceError({
                code: 'PROJECT_NOT_INITIALIZED',
                projectName,
                friendlyMessage:
                    'RegressionProof.ai not initialized. Ask the project owner for an invite token, then run `npx regressionproof invite accept <token>`.',
                version: getPackageVersion(),
            })
        }

        this.snapshotter.checkForPreviousFailure(this.config.mirrorPath)
    }

    public onTestFileStart(_test: Test): void {}

    public onTestCaseResult(
        _test: Test,
        _testCaseResult: TestCaseResult
    ): void {}

    public async onRunComplete(
        _testContexts: Set<TestContext>,
        results: AggregatedResult
    ): Promise<void> {
        if (this.isCi) {
            console.log('[RegressionProof] CI detected; skipping snapshot')
            return
        }

        if (!this.config) {
            return
        }

        const testResults = transformResults(results, this.cwd)
        const typeErrors = captureTypeErrors(this.cwd)

        if (typeErrors.length > 0) {
            testResults.typeErrors = typeErrors
        }

        console.log(
            `[RegressionProof] ${testResults.summary.passedTests}/${testResults.summary.totalTests} tests passed`
        )

        if (typeErrors.length > 0) {
            console.log(
                `[RegressionProof] ${typeErrors.length} type error(s) found`
            )
        }

        await this.snapshotter.snapshot({
            sourcePath: this.cwd,
            mirrorPath: this.config.mirrorPath,
            testResults,
            remote: this.config.remote,
        })

        console.log('[RegressionProof] Snapshot complete')
    }

    public getLastError(): Error | void {
        return undefined
    }
}
