import { existsSync, mkdirSync, unlinkSync } from 'fs'
import path from 'path'

export default class SnapshotterState {
    private static readonly STATE_DIR_NAME = '.snapshotter'
    private static readonly LEGACY_RUNTIME_FILES = [
        'push.lock',
        'push.pending',
        'lastError.json',
        'snapshot.lock',
        'pending.json',
    ]

    private constructor() {}

    public static GetStateDir(mirrorPath: string): string {
        return path.join(
            path.dirname(mirrorPath),
            SnapshotterState.STATE_DIR_NAME
        )
    }

    public static EnsureStateDir(mirrorPath: string): string {
        const stateDir = SnapshotterState.GetStateDir(mirrorPath)
        mkdirSync(stateDir, { recursive: true })
        return stateDir
    }

    public static CleanupLegacyMirrorState(mirrorPath: string): void {
        const legacyDir = path.join(mirrorPath, SnapshotterState.STATE_DIR_NAME)

        if (!existsSync(legacyDir)) {
            return
        }

        for (const file of SnapshotterState.LEGACY_RUNTIME_FILES) {
            const filePath = path.join(legacyDir, file)
            if (existsSync(filePath)) {
                unlinkSync(filePath)
            }
        }
    }
}
