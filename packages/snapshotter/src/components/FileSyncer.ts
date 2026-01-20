import { exec } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default class FileSyncer {
    private static readonly DEFAULT_EXCLUDES = [
        'node_modules',
        'build',
        '*.env*',
        '*.pem',
        '*.key',
        '*.p12',
        '*.pfx',
        '*credentials*',
        '*secret*',
        '*.local',
    ]

    private constructor() {}

    public static Syncer(): FileSyncer {
        return new this()
    }

    public async sync(sourcePath: string, mirrorPath: string): Promise<void> {
        const hasGitIgnore = existsSync(path.join(sourcePath, '.gitignore'))
        const excludes = FileSyncer.DEFAULT_EXCLUDES.map(
            (e) => `--exclude='${e}'`
        ).join(' ')

        if (hasGitIgnore) {
            await this.syncWithGitIgnore(sourcePath, mirrorPath, excludes)
        } else {
            await this.syncWithDelete(sourcePath, mirrorPath, excludes)
        }
    }

    private async syncWithGitIgnore(
        sourcePath: string,
        mirrorPath: string,
        excludes: string
    ): Promise<void> {
        // Filter through a file existence check to handle deleted files in git index
        // This is more portable than --ignore-missing-args which isn't available on older rsync (macOS)
        const cmd =
            `cd "${sourcePath}" && git ls-files --cached --others --exclude-standard -z | ` +
            `while IFS= read -r -d '' file; do [ -e "$file" ] && printf '%s\\0' "$file"; done | ` +
            `rsync -av --files-from=- --from0 ${excludes} . "${mirrorPath}/"`
        await execAsync(cmd)
    }

    private async syncWithDelete(
        sourcePath: string,
        mirrorPath: string,
        excludes: string
    ): Promise<void> {
        const cmd = `rsync -av --delete ${excludes} "${sourcePath}/" "${mirrorPath}/"`
        await execAsync(cmd)
    }
}
