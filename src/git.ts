import { exec } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function gitCommit(mirror: string): Promise<boolean> {
    const gitDir = path.join(mirror, '.git')

    // Init repo if .git doesn't exist
    if (!existsSync(gitDir)) {
        await execAsync(`git -C "${mirror}" init`)
    }

    // Stage all changes
    await execAsync(`git -C "${mirror}" add -A`)

    // Check if there are changes to commit
    const { stdout } = await execAsync(`git -C "${mirror}" status --porcelain`)
    if (!stdout.trim()) {
        return false // nothing to commit
    }

    // Commit
    const message = `Snapshot ${new Date().toISOString()}`
    await execAsync(`git -C "${mirror}" commit -m "${message}"`)
    return true
}
