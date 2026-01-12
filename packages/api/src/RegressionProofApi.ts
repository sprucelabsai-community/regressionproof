import Fastify, { FastifyInstance } from 'fastify'
import ErrorOptions from '#spruce/errors/options.types'

export default class RegressionProofApi {
    private server: FastifyInstance
    private port?: number
    private giteaUrl: string
    private giteaAdminUser: string
    private giteaAdminPassword: string

    public constructor(options: RegressionProofApiOptions) {
        const { giteaUrl, giteaAdminUser, giteaAdminPassword } = options
        this.giteaUrl = giteaUrl
        this.giteaAdminUser = giteaAdminUser
        this.giteaAdminPassword = giteaAdminPassword
        this.server = Fastify()
        this.setupRoutes()
    }

    private setupRoutes() {
        this.server.get('/check-name/:name', async (request) => {
            const { name } = request.params as { name: string }
            const exists = await this.repoExists(name)
            return { available: !exists }
        })

        this.server.post('/register', async (request, reply) => {
            const { name } = request.body as { name: string }

            if (!this.isValidSlug(name)) {
                void reply.status(400)
                return {
                    error: { code: 'INVALID_PROJECT_NAME', name },
                }
            }

            try {
                const exists = await this.repoExists(name)
                if (exists) {
                    void reply.status(409)
                    return {
                        error: { code: 'PROJECT_ALREADY_EXISTS', name },
                    }
                }

                await this.createRepo(name)
                const url = `${this.giteaUrl}/${this.giteaAdminUser}/${name}.git`
                const token = await this.createGiteaToken(name)

                return { url, token }
            } catch (err) {
                void reply.status(502)
                return { error: this.buildGitServerError(err) }
            }
        })

        this.server.post('/refresh', async (request, reply) => {
            const { name } = request.body as { name: string }

            try {
                const exists = await this.repoExists(name)
                if (!exists) {
                    void reply.status(404)
                    return {
                        error: { code: 'PROJECT_NOT_FOUND', name },
                    }
                }

                const url = `${this.giteaUrl}/${this.giteaAdminUser}/${name}.git`
                const token = await this.createGiteaToken(name)
                return { url, token }
            } catch (err) {
                void reply.status(502)
                return { error: this.buildGitServerError(err) }
            }
        })
    }

    private async repoExists(name: string): Promise<boolean> {
        const response = await fetch(
            `${this.giteaUrl}/api/v1/repos/${this.giteaAdminUser}/${name}`,
            {
                headers: {
                    Authorization: `Basic ${this.getBasicAuth()}`,
                },
            }
        )
        return response.ok
    }

    private async createRepo(name: string): Promise<void> {
        const response = await fetch(`${this.giteaUrl}/api/v1/user/repos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${this.getBasicAuth()}`,
            },
            body: JSON.stringify({ name }),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(
                `Failed to create repo: ${response.status} ${response.statusText} - ${text}`
            )
        }
    }

    private getBasicAuth(): string {
        return Buffer.from(
            `${this.giteaAdminUser}:${this.giteaAdminPassword}`
        ).toString('base64')
    }

    private isValidSlug(name: string): boolean {
        return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(name)
    }

    private buildGitServerError(err: unknown): ErrorOptions {
        const message = err instanceof Error ? err.message : String(err)
        if (
            message.includes('ECONNREFUSED') ||
            message.includes('fetch failed')
        ) {
            return { code: 'GIT_SERVER_UNAVAILABLE', url: this.giteaUrl }
        }
        return { code: 'GIT_SERVER_ERROR', message }
    }

    private async createGiteaToken(name: string): Promise<string> {
        const response = await fetch(
            `${this.giteaUrl}/api/v1/users/${this.giteaAdminUser}/tokens`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${this.getBasicAuth()}`,
                },
                body: JSON.stringify({
                    name: `${name}-${Date.now()}`,
                    scopes: ['write:repository', 'write:user'],
                }),
            }
        )

        if (!response.ok) {
            const text = await response.text()
            throw new Error(
                `Failed to create token: ${response.status} ${response.statusText} - ${text}`
            )
        }

        const data = (await response.json()) as { sha1: string }
        return data.sha1
    }

    public async start(port = 0, host?: string): Promise<void> {
        await this.server.listen({ port, host })
        const address = this.server.addresses()[0]
        this.port =
            typeof address === 'string' ? parseInt(address) : address.port
    }

    public async stop(): Promise<void> {
        await this.server.close()
    }

    public getPort(): number {
        if (!this.port) {
            throw new Error('Server not started')
        }
        return this.port
    }
}

export interface RegressionProofApiOptions {
    giteaUrl: string
    giteaAdminUser: string
    giteaAdminPassword: string
}
