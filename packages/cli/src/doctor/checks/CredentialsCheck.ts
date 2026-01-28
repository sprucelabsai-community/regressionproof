import fs from 'fs'
import ConfigManager from '../../config/ConfigManager.js'
import DoctorContext from '../DoctorContext.js'
import type { DoctorResult } from '../DoctorResult.js'

export default class CredentialsCheck {
    public async run(context: DoctorContext): Promise<DoctorResult> {
        if (!context.projectName) {
            return {
                name: 'Credentials for project',
                status: 'warn',
                details: [
                    'Unable to resolve project name from .regressionproof.json.',
                ],
                fix: 'Run `npx regressionproof init` from the project root.',
            }
        }

        const configManager = new ConfigManager()
        const configPath = context.credentialsPath

        if (!configPath || !fs.existsSync(configPath)) {
            return {
                name: `Credentials for project "${context.projectName}"`,
                status: 'fail',
                details: [
                    `Missing credentials at ${
                        configPath ??
                        configManager.getConfigDir(context.projectName)
                    }.`,
                ],
                fix: 'Run `npx regressionproof invite accept <token>` (teammate) or `npx regressionproof init` (owner).',
            }
        }

        const parsed = this.safeReadJson(configPath)
        const url = parsed?.remote?.url
        const token = parsed?.remote?.token

        if (!url || !token) {
            return {
                name: `Credentials for project "${context.projectName}"`,
                status: 'fail',
                details: [
                    'Credentials file is missing remote.url or remote.token.',
                ],
                fix: 'Run `npx regressionproof invite accept <token>` to refresh credentials.',
            }
        }

        return {
            name: `Credentials for project "${context.projectName}"`,
            status: 'ok',
            details: [`Credentials found at ${configPath}.`],
        }
    }

    private safeReadJson(filePath: string): ProjectConfig | null {
        try {
            return JSON.parse(
                fs.readFileSync(filePath, 'utf-8')
            ) as ProjectConfig
        } catch {
            return null
        }
    }
}

interface ProjectConfig {
    remote?: {
        url?: string
        token?: string
    }
}
