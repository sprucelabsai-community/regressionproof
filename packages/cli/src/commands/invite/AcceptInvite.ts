import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import ConfigManager from '../../config/ConfigManager.js'
import { toSlug } from '../../utilities/slug.js'

const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

export default async function acceptInvite(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/invites/accept`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Invite accept failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as InviteAcceptResponse
    const projectName = deriveProjectNameFromUrl(data.url)
    const configManager = new ConfigManager()
    configManager.saveCredentials(projectName, {
        url: data.url,
        token: data.token,
    })
    configManager.writeLocalConfig(projectName, data.url)
    ensureMirrorCloned(
        configManager.getConfigDir(projectName),
        data.url,
        data.token
    )
    console.log('Project URL:', data.url)
    console.log('Project token:', data.token)
}

function deriveProjectNameFromUrl(url: string): string {
    const match = url.match(/[/:]([^/:]+?)(\.git)?$/)
    const name = toSlug(match?.[1] ?? '')
    if (!name) {
        throw new Error(`Unable to determine project name from url: ${url}`)
    }
    return name
}

function ensureMirrorCloned(
    configDir: string,
    url: string,
    token: string
): void {
    const mirrorPath = path.join(configDir, 'mirror')
    if (fs.existsSync(mirrorPath)) {
        return
    }

    fs.mkdirSync(configDir, { recursive: true })
    const authedUrl = url.replace('://', `://${token}@`)
    execSync(`git clone "${authedUrl}" "${mirrorPath}"`, { stdio: 'inherit' })
}

interface InviteAcceptResponse {
    url: string
    token: string
}
