import Fastify, { FastifyInstance } from 'fastify'

export interface RegressionProofApiOptions {
    giteaUrl: string
    giteaAdminUser: string
    giteaAdminPassword: string
}

export class RegressionProofApi {
    private server: FastifyInstance
    private port?: number
    private projects = new Map<string, { url: string }>()
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
        this.server.post('/register', async (request, _reply) => {
            const { name } = request.body as { name: string }

            const url = `${this.giteaUrl}/${this.giteaAdminUser}/${name}.git`
            const token = await this.createGiteaToken(name)

            this.projects.set(name, { url })

            return { url, token }
        })

        this.server.post('/refresh', async (request, reply) => {
            const { name } = request.body as { name: string }

            const project = this.projects.get(name)
            if (!project) {
                void reply.status(404)
                return { error: 'Project not found' }
            }

            const token = await this.createGiteaToken(name)

            return { url: project.url, token }
        })
    }

    private async createGiteaToken(name: string): Promise<string> {
        const basicAuth = Buffer.from(
            `${this.giteaAdminUser}:${this.giteaAdminPassword}`
        ).toString('base64')

        const response = await fetch(
            `${this.giteaUrl}/api/v1/users/${this.giteaAdminUser}/tokens`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Basic ${basicAuth}`,
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

    public async start(port = 0): Promise<void> {
        await this.server.listen({ port })
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
