import { exec } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

const DEFAULT_EXCLUDES = [
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

export async function syncFiles(
    sourcePath: string,
    mirrorPath: string
): Promise<void> {
    const hasGitIgnore = existsSync(path.join(sourcePath, '.gitignore'))

    if (hasGitIgnore) {
        const cmd = `cd "${sourcePath}" && git ls-files --cached --others --exclude-standard -z | rsync -av --files-from=- --from0 . "${mirrorPath}/"`
        await execAsync(cmd)
    } else {
        const excludes = DEFAULT_EXCLUDES.map((e) => `--exclude='${e}'`).join(
            ' '
        )
        const cmd = `rsync -av --delete ${excludes} "${sourcePath}/" "${mirrorPath}/"`
        await execAsync(cmd)
    }
}
