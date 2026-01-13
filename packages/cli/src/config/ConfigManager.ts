import fs from 'fs'
import os from 'os'
import path from 'path'
import { getCliVersion } from '../utilities/version.js'

export default class ConfigManager {
    private baseDir: string

    public constructor(
        baseDir: string = path.join(os.homedir(), '.regressionproof')
    ) {
        this.baseDir = baseDir
    }

    public getConfigDir(projectName: string): string {
        return path.join(this.baseDir, projectName)
    }

    public saveCredentials(
        projectName: string,
        credentials: Credentials
    ): void {
        const configDir = this.getConfigDir(projectName)
        fs.mkdirSync(configDir, { recursive: true })

        const configPath = path.join(configDir, 'config.json')
        const config: ProjectConfig = {
            remote: {
                url: credentials.url,
                token: credentials.token,
            },
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    }

    public loadCredentials(projectName: string): Credentials | null {
        const configPath = path.join(
            this.getConfigDir(projectName),
            'config.json'
        )
        if (!fs.existsSync(configPath)) {
            return null
        }

        const config: ProjectConfig = JSON.parse(
            fs.readFileSync(configPath, 'utf-8')
        )
        return {
            url: config.remote.url,
            token: config.remote.token,
        }
    }

    public writeLocalConfig(projectName: string, url: string): void {
        const configPath = path.join(process.cwd(), '.regressionproof.json')
        const payload = {
            version: getCliVersion(),
            projectName,
            remote: {
                url,
            },
        }
        fs.writeFileSync(configPath, JSON.stringify(payload, null, 2))
    }
}

export interface Credentials {
    url: string
    token: string
}

export interface ProjectConfig {
    remote: {
        url: string
        token: string
    }
}
