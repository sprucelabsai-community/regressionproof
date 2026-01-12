import client from '@regressionproof/client'
import ConfigManager from '../../config/ConfigManager.js'

const RegressionProofClient = client.default ?? client
const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

export default async function createInvite(
    projectName: string,
    note?: string
): Promise<void> {
    const configManager = new ConfigManager()
    const creds = configManager.loadCredentials(projectName)
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

    const data = (await response.json()) as { token: string; projectName: string }
    console.log('Invite token:', data.token)
}
