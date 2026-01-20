import {
    existsSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
} from 'fs'
import path from 'path'

export default class ErrorHandler {
    private static readonly ERROR_FILE_NAME = 'lastError.json'

    private constructor() {}

    public static Handler(): ErrorHandler {
        return new this()
    }

    public checkForPreviousFailure(mirrorPath: string): void {
        const errorPath = this.getErrorFilePath(mirrorPath)

        if (existsSync(errorPath)) {
            const errorData = JSON.parse(readFileSync(errorPath, 'utf-8'))
            unlinkSync(errorPath)

            throw new Error(
                `Previous snapshot failed: ${errorData.message}\n` +
                    `Timestamp: ${errorData.timestamp}\n` +
                    `This error was from a background snapshot that failed. ` +
                    `The snapshot has been retried - if this error persists, check your configuration.`
            )
        }
    }

    public persistError(mirrorPath: string, err: unknown): void {
        const snapshotterDir = path.join(mirrorPath, '.snapshotter')
        mkdirSync(snapshotterDir, { recursive: true })

        const errorPath = this.getErrorFilePath(mirrorPath)
        const errorData = {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString(),
        }

        writeFileSync(errorPath, JSON.stringify(errorData, null, 2))
    }

    public clearError(mirrorPath: string): void {
        const errorPath = this.getErrorFilePath(mirrorPath)

        if (existsSync(errorPath)) {
            unlinkSync(errorPath)
        }
    }

    private getErrorFilePath(mirrorPath: string): string {
        return path.join(
            mirrorPath,
            '.snapshotter',
            ErrorHandler.ERROR_FILE_NAME
        )
    }
}
