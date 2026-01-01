import { exec } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { RemoteOptions } from './snapshotter.types'

const execAsync = promisify(exec)

export async function gitCommit(mirrorPath: string): Promise<boolean> {
    const gitDir = path.join(mirrorPath, '.git')

    if (!existsSync(gitDir)) {
        await execAsync(`git -C "${mirrorPath}" init`)
    }

    await execAsync(`git -C "${mirrorPath}" add -A`)

    const { stdout } = await execAsync(
        `git -C "${mirrorPath}" status --porcelain`
    )
    if (!stdout.trim()) {
        return false
    }

    const message = `Snapshot ${new Date().toISOString()}`
    await execAsync(`git -C "${mirrorPath}" commit -m "${message}"`)
    return true
}

export async function gitPush(
    mirrorPath: string,
    remote: RemoteOptions
): Promise<void> {
    const authedUrl = remote.url.replace('://', `://${remote.token}@`)

    try {
        await execAsync(`git -C "${mirrorPath}" remote get-url origin`)
        await execAsync(
            `git -C "${mirrorPath}" remote set-url origin "${authedUrl}"`
        )
    } catch {
        await execAsync(
            `git -C "${mirrorPath}" remote add origin "${authedUrl}"`
        )
    }

    await execAsync(`git -C "${mirrorPath}" push -u origin HEAD`)
}
