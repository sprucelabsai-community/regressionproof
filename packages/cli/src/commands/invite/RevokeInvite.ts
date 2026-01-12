const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

export default async function revokeInvite(token: string): Promise<void> {
    const response = await fetch(
        `${API_URL}/invites/${encodeURIComponent(token)}`,
        {
            method: 'DELETE',
        }
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Invite revoke failed: ${response.status} ${text}`)
    }

    console.log('Invite revoked.')
}
