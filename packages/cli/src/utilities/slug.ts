import { execSync } from 'child_process'

export function toSlug(input: string): string {
    return input
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export function getRepoNameFromGit(): string {
    try {
        const remoteUrl = execSync('git remote get-url origin', {
            encoding: 'utf-8',
        }).trim()
        const match = remoteUrl.match(/[/:]([^/:]+?)(\.git)?$/)
        return toSlug(match?.[1] ?? '')
    } catch {
        return ''
    }
}
