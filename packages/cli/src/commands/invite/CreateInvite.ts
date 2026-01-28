import ConfigManager from '../../config/ConfigManager.js'
import { toSlug } from '../../utilities/slug.js'

const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

class InviteCreator {
    public constructor(private configManager = new ConfigManager()) {}

    public async run(projectNameArg?: string, note?: string): Promise<void> {
        const projectName = this.resolveProjectName(projectNameArg)
        const creds = this.configManager.loadCredentials(projectName)
        if (!creds) {
            throw new Error(
                `No credentials found for ${projectName}. Run regressionproof init first.`
            )
        }

        const response = await fetch(`${API_URL}/invites`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${creds.token}`,
            },
            body: JSON.stringify({ name: projectName, note }),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Invite create failed: ${response.status} ${text}`)
        }

        const data = (await response.json()) as InviteCreateResponse
        console.log('Invite token:', data.token)
    }

    private resolveProjectName(projectNameArg?: string): string {
        const provided = projectNameArg ? toSlug(projectNameArg) : ''
        const name = provided || this.configManager.getLocalProjectName()
        if (!name) {
            throw new Error(
                'Project name is required. Provide it explicitly or ensure .regressionproof.json exists.'
            )
        }
        return name
    }
}

export default async function createInvite(
    projectName?: string,
    note?: string
): Promise<void> {
    const creator = new InviteCreator()
    await creator.run(projectName, note)
}

interface InviteCreateResponse {
    token: string
    projectName: string
}
