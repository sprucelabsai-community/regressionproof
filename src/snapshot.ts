import { copyFileSync, mkdirSync } from 'fs'
import path from 'path'
import { gitCommit, gitPush } from './git'
import { SnapshotOptions } from './snapshotter.types'
import { syncFiles } from './sync'

export async function snapshot(options: SnapshotOptions): Promise<boolean> {
    const sourcePath = options.sourcePath ?? process.cwd()
    const { mirrorPath, metadataPath, remote } = options

    await syncFiles(sourcePath, mirrorPath)

    const snapshotterDir = path.join(mirrorPath, '.snapshotter')
    mkdirSync(snapshotterDir, { recursive: true })
    copyFileSync(metadataPath, path.join(snapshotterDir, 'metadata.json'))

    const committed = await gitCommit(mirrorPath)

    if (committed) {
        await gitPush(mirrorPath, remote)
    }

    return committed
}
