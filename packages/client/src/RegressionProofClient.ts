export interface RegisterProjectOptions {
    name: string
}

export interface ProjectCredentials {
    url: string
    token: string
}

export class RegressionProofClient {
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
            throw new Error(
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
            throw new Error(
                `Failed to refresh credentials: ${response.statusText}`
            )
        }

        return response.json()
    }
}
