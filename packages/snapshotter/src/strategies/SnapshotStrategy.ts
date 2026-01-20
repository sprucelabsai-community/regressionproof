import { SnapshotOptions } from '../snapshotter.types.js'

export default interface SnapshotStrategy {
    execute(options: SnapshotOptions): Promise<void> | void
}
