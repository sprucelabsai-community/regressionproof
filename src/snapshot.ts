import { copyFileSync, mkdirSync } from 'fs'
import path from 'path'
import { gitCommit } from './git'
import { SnapshotOptions } from './snapshotter.types'
import { syncFiles } from './sync'

export async function snapshot(options: SnapshotOptions): Promise<boolean> {
    const source = options.source ?? process.cwd()
    const { mirror, metadata } = options

    // 1. Sync source files to mirror
    await syncFiles(source, mirror)

    // 2. Copy metadata to .snapshotter/metadata.json
    const snapshotterDir = path.join(mirror, '.snapshotter')
    mkdirSync(snapshotterDir, { recursive: true })
    copyFileSync(metadata, path.join(snapshotterDir, 'metadata.json'))

    // 3. Commit everything
    const committed = await gitCommit(mirror)
    return committed
}
