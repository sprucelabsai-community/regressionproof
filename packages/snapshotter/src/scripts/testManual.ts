import { Snapshotter } from '../index'

async function main() {
    const sourcePath = process.env.SOURCE_PATH
    const mirrorPath = process.env.MIRROR_PATH
    const remoteUrl = process.env.REMOTE_URL
    const remoteToken = process.env.REMOTE_TOKEN

    if (!sourcePath || !mirrorPath || !remoteUrl || !remoteToken) {
        console.error('Missing required env vars. See .env.example')
        process.exit(1)
    }

    console.log('Running snapshot...')
    console.log('  Source:', sourcePath)
    console.log('  Mirror:', mirrorPath)
    console.log('  Remote:', remoteUrl)

    const snapshotter = Snapshotter.Snapshotter({ mode: 'sync' })

    await snapshotter.snapshot({
        sourcePath,
        mirrorPath,
        testResults: {
            timestamp: new Date().toISOString(),
            summary: {
                totalSuites: 1,
                passedSuites: 1,
                failedSuites: 0,
                totalTests: 2,
                passedTests: 2,
                failedTests: 0,
            },
            suites: [
                {
                    path: 'src/__tests__/Example.test.ts',
                    passed: true,
                    tests: [
                        { name: 'should work', passed: true },
                        { name: 'should also work', passed: true },
                    ],
                },
            ],
        },
        remote: {
            url: remoteUrl,
            token: remoteToken,
        },
    })

    console.log('Snapshot completed')
}

main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
})
