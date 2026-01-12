import crypto from 'crypto'
import { Db } from '../db/types'

export default class InvitesStore {
    public constructor(private db: Db) {}

    public async createInvite(
        projectName: string,
        note?: string
    ): Promise<{ token: string; createdAt: string }> {
        const token = this.generateToken()
        const tokenHash = this.hashToken(token)
        const createdAt = new Date().toISOString()

        await this.db.run(
            `INSERT INTO invites (token_hash, project_name, created_at, note)
             VALUES (?, ?, ?, ?)`,
            [tokenHash, projectName, createdAt, note ?? null]
        )

        return { token, createdAt }
    }

    public async listInvites(projectName?: string): Promise<InviteSummary[]> {
        const rows = projectName
            ? await this.db.all<InviteRecord>(
                  `SELECT token_hash AS tokenHash,
                          project_name AS projectName,
                          created_at AS createdAt,
                          used_at AS usedAt,
                          revoked_at AS revokedAt,
                          note
                   FROM invites
                   WHERE project_name = ?
                   ORDER BY created_at DESC`,
                  [projectName]
              )
            : await this.db.all<InviteRecord>(
                  `SELECT token_hash AS tokenHash,
                          project_name AS projectName,
                          created_at AS createdAt,
                          used_at AS usedAt,
                          revoked_at AS revokedAt,
                          note
                   FROM invites
                   ORDER BY created_at DESC`
              )

        return rows.map((row) => ({
            projectName: row.projectName,
            createdAt: row.createdAt,
            usedAt: row.usedAt ?? null,
            revokedAt: row.revokedAt ?? null,
            note: row.note ?? null,
            status: row.revokedAt
                ? 'revoked'
                : row.usedAt
                  ? 'used'
                  : 'active',
        }))
    }

    public async revokeInvite(token: string): Promise<void> {
        const tokenHash = this.hashToken(token)
        const now = new Date().toISOString()
        await this.db.run(
            `UPDATE invites
             SET revoked_at = ?
             WHERE token_hash = ? AND used_at IS NULL`,
            [now, tokenHash]
        )
    }

    public async acceptInvite(
        token: string
    ): Promise<{ projectName: string }> {
        const tokenHash = this.hashToken(token)
        const invite = await this.db.get<InviteRecord>(
            `SELECT token_hash AS tokenHash,
                    project_name AS projectName,
                    created_at AS createdAt,
                    used_at AS usedAt,
                    revoked_at AS revokedAt,
                    note
             FROM invites
             WHERE token_hash = ?`,
            [tokenHash]
        )

        if (!invite) {
            throw new Error('Invite not found')
        }
        if (invite.revokedAt) {
            throw new Error('Invite revoked')
        }
        if (invite.usedAt) {
            throw new Error('Invite already used')
        }

        const usedAt = new Date().toISOString()
        await this.db.run(
            `UPDATE invites
             SET used_at = ?
             WHERE token_hash = ?`,
            [usedAt, tokenHash]
        )

        return { projectName: invite.projectName }
    }

    private generateToken(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex')
    }
}

export interface InviteRecord {
    tokenHash: string
    projectName: string
    createdAt: string
    usedAt?: string | null
    revokedAt?: string | null
    note?: string | null
}

export interface InviteSummary {
    projectName: string
    createdAt: string
    usedAt?: string | null
    revokedAt?: string | null
    note?: string | null
    status: 'active' | 'used' | 'revoked'
}
