export default class RegressionProofClient {
    private baseUrl: string

    public constructor(baseUrl: string) {
        this.baseUrl = baseUrl
    }

    public async registerProject(
        options: RegisterProjectOptions
    ): Promise<ProjectCredentials> {
        const response = await fetch(`${this.baseUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        })

        if (!response.ok) {
            const body = await this.parseErrorBody(response)
            throw new Error(
                body.error ??
                    `Failed to register project: ${response.statusText}`
            )
        }

        return response.json()
    }

    public async refreshCredentials(
        options: RegisterProjectOptions
    ): Promise<ProjectCredentials> {
        const response = await fetch(`${this.baseUrl}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(options),
        })

        if (!response.ok) {
            const body = await this.parseErrorBody(response)
            throw new Error(
                body.error ??
                    `Failed to refresh credentials: ${response.statusText}`
            )
        }

        return response.json()
    }

    private async parseErrorBody(
        response: Response
    ): Promise<{ error?: string }> {
        try {
            return await response.json()
        } catch {
            return {}
        }
    }
}

export interface RegisterProjectOptions {
    name: string
}

export interface ProjectCredentials {
    url: string
    token: string
}
