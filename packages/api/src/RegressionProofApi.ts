import Fastify, { FastifyInstance } from 'fastify'

export class RegressionProofApi {
    private server: FastifyInstance
    private port?: number
    private projects = new Map<string, { url: string; tokenCount: number }>()

    public constructor() {
        this.server = Fastify()
        this.setupRoutes()
    }

    private setupRoutes() {
        this.server.post('/register', async (request, _reply) => {
            const { name } = request.body as { name: string }

            const url = `http://localhost:3333/admin/${name}.git`
            const tokenCount = 1

            this.projects.set(name, { url, tokenCount })

            // TODO: Create repo in Gitea and generate token
            return {
                url,
                token: this.generateToken(name, tokenCount),
            }
        })

        this.server.post('/refresh', async (request, reply) => {
            const { name } = request.body as { name: string }

            const project = this.projects.get(name)
            if (!project) {
                void reply.status(404)
                return { error: 'Project not found' }
            }

            project.tokenCount++

            // TODO: Generate new token in Gitea
            return {
                url: project.url,
                token: this.generateToken(name, project.tokenCount),
            }
        })
    }

    private generateToken(name: string, count: number): string {
        return `token-${name}-${count}`
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
