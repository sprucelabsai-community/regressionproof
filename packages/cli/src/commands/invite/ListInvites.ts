const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

export default async function listInvites(projectName?: string): Promise<void> {
    const query = projectName ? `?name=${encodeURIComponent(projectName)}` : ''
    const response = await fetch(`${API_URL}/invites${query}`)

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`Invite list failed: ${response.status} ${text}`)
    }

    const data = (await response.json()) as Array<{
        projectName: string
        createdAt: string
        usedAt?: string | null
        revokedAt?: string | null
        note?: string | null
        status: 'active' | 'used' | 'revoked'
    }>

    if (data.length === 0) {
        console.log('No invites found.')
        return
    }

    for (const invite of data) {
        console.log(
            `${invite.projectName} | ${invite.status} | created ${invite.createdAt}` +
                (invite.note ? ` | ${invite.note}` : '')
        )
    }
}
