export interface TestResult {
    /** Name of the individual test */
    name: string
    /** Whether this test passed */
    passed: boolean
    /** Full error message + callstack (only present if failed) */
    error?: string
}

export interface TypeCheckError {
    /** File path relative to project root */
    file: string
    /** Line number (1-indexed) */
    line: number
    /** Column number (1-indexed) */
    column: number
    /** TypeScript error code (e.g., "TS2322") */
    code: string
    /** Error message */
    message: string
}

export interface SuiteResult {
    /** Path to test file, relative to project root */
    path: string
    /** Whether all tests in suite passed */
    passed: boolean
    /** Array of test results */
    tests: TestResult[]
}

export interface TestResultsSummary {
    /** Total number of test suites (files) */
    totalSuites: number
    /** Number of suites with all tests passing */
    passedSuites: number
    /** Number of suites with at least one failure */
    failedSuites: number
    /** Total number of individual tests */
    totalTests: number
    /** Number of passing tests */
    passedTests: number
    /** Number of failing tests */
    failedTests: number
}

export interface TestResults {
    /** ISO 8601 timestamp of when test run completed */
    timestamp: string
    /** Summary counts */
    summary: TestResultsSummary
    /** Array of suite results */
    suites: SuiteResult[]
    /** TypeScript type check errors (only present if project has tsconfig.json) */
    typeErrors?: TypeCheckError[]
}

export interface RemoteOptions {
    /** Gitea repo URL to push to */
    url: string
    /** Gitea access token for authentication */
    token: string
}

export interface SnapshotOptions {
    /** Source project path to sync from. Defaults to process.cwd() */
    sourcePath?: string
    /** Mirror directory path where the isolated git repo lives */
    mirrorPath: string
    /** Test results from the completed test run */
    testResults: TestResults
    /** Remote Gitea repo to push to */
    remote: RemoteOptions
}
