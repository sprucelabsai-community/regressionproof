import client from '@regressionproof/client'

const RegressionProofClient = client.default ?? client
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

    const data = (await response.json()) as { url: string; token: string }
    console.log('Project URL:', data.url)
    console.log('Project token:', data.token)
}
