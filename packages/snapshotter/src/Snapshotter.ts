import ErrorHandler from './components/ErrorHandler.js'
import { SnapshotOptions } from './snapshotter.types.js'
import AsyncStrategy from './strategies/AsyncStrategy.js'
import SnapshotStrategy from './strategies/SnapshotStrategy.js'
import SyncStrategy from './strategies/SyncStrategy.js'

export default class Snapshotter {
    private strategy: SnapshotStrategy

    private constructor(strategy: SnapshotStrategy) {
        this.strategy = strategy
    }

    public static Snapshotter(options?: SnapshotterOptions): Snapshotter {
        const mode = options?.mode ?? 'async'
        const strategy =
            mode === 'sync' ? SyncStrategy.Strategy() : AsyncStrategy.Strategy()

        return new this(strategy)
    }

    public snapshot(options: SnapshotOptions): void | Promise<void> {
        return this.strategy.execute(options)
    }

    public checkForPreviousFailure(mirrorPath: string): void {
        ErrorHandler.Handler().checkForPreviousFailure(mirrorPath)
    }
}

export interface SnapshotterOptions {
    mode?: 'sync' | 'async'
}
