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

export async function syncFiles(source: string, mirror: string): Promise<void> {
    const hasGitIgnore = existsSync(path.join(source, '.gitignore'))

    if (hasGitIgnore) {
        // Use git ls-files to get list of files respecting .gitignore
        // Then pipe to rsync
        const cmd = `cd "${source}" && git ls-files --cached --others --exclude-standard -z | rsync -av --files-from=- --from0 . "${mirror}/"`
        await execAsync(cmd)
    } else {
        // Use rsync with default excludes
        const excludes = DEFAULT_EXCLUDES.map((e) => `--exclude='${e}'`).join(
            ' '
        )
        const cmd = `rsync -av --delete ${excludes} "${source}/" "${mirror}/"`
        await execAsync(cmd)
    }
}
