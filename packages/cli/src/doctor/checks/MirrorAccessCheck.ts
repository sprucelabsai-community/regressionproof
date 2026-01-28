import { execSync } from 'child_process'
import fs from 'fs'
import ConfigManager from '../../config/ConfigManager.js'
import DoctorContext from '../DoctorContext.js'
import type { DoctorResult } from '../DoctorResult.js'

export default class MirrorAccessCheck {
    public async run(context: DoctorContext): Promise<DoctorResult> {
        if (!context.projectName) {
            return {
                name: 'Mirror directory',
                status: 'warn',
                details: [
                    'Unable to resolve project name from .regressionproof.json.',
                ],
                fix: 'Run `npx regressionproof init` from the project root.',
            }
        }

        const configManager = new ConfigManager()
        const mirrorPath = context.mirrorPath
        const credentials = configManager.loadCredentials(context.projectName)

        if (!mirrorPath || !fs.existsSync(mirrorPath)) {
            return {
                name: 'Mirror directory',
                status: 'warn',
                details: [
                    `Mirror directory not found at ${
                        mirrorPath ??
                        configManager.getConfigDir(context.projectName)
                    }.`,
                    'This is normal before the first snapshot is created.',
                ],
                fix: 'Run your tests to create the first snapshot.',
            }
        }

        if (!credentials) {
            return {
                name: 'Mirror directory',
                status: 'warn',
                details: ['Credentials not found; remote access not checked.'],
                fix: 'Run `npx regressionproof invite accept <token>` (teammate) or `npx regressionproof init` (owner).',
            }
        }

        const authedUrl = credentials.url.replace(
            '://',
            `://${credentials.token}@`
        )

        const pullResult = this.checkPullAccess(authedUrl)
        if (!pullResult.ok) {
            return {
                name: 'Mirror directory',
                status: 'fail',
                details: [
                    'Unable to access remote (pull).',
                    pullResult.message ?? 'Unknown error.',
                ],
                fix: 'Run `npx regressionproof invite accept <token>` to refresh credentials.',
            }
        }

        const pushResult = this.checkPushAccess(mirrorPath, authedUrl)
        if (pushResult.status === 'fail') {
            return {
                name: 'Mirror directory',
                status: 'fail',
                details: [
                    'Unable to access remote (push).',
                    pushResult.message ?? 'Unknown error.',
                ],
                fix: 'Run `npx regressionproof invite accept <token>` to refresh credentials.',
            }
        }

        if (pushResult.status === 'warn') {
            return {
                name: 'Mirror directory',
                status: 'warn',
                details: [
                    'Remote access confirmed (pull).',
                    pushResult.message ?? 'Unknown error.',
                ],
                fix: 'Run your tests to create the first snapshot.',
            }
        }

        return {
            name: 'Mirror directory',
            status: 'ok',
            details: [
                `Mirror directory exists at ${mirrorPath}.`,
                'Remote access confirmed (pull/push).',
            ],
        }
    }

    private checkPullAccess(url: string): AccessResult {
        try {
            execSync(`git ls-remote "${url}"`, { stdio: 'pipe' })
            return { ok: true }
        } catch (err) {
            return {
                ok: false,
                message: this.getErrorMessage(err),
            }
        }
    }

    private checkPushAccess(mirrorPath: string, url: string): PushResult {
        try {
            execSync(`git -C "${mirrorPath}" push --dry-run "${url}" HEAD`, {
                stdio: 'pipe',
            })
            return { status: 'ok' }
        } catch (err) {
            const message = this.getErrorMessage(err)
            if (this.isNoCommitsError(message)) {
                return {
                    status: 'warn',
                    message: 'No commits in mirror; push check skipped.',
                }
            }
            return { status: 'fail', message }
        }
    }

    private isNoCommitsError(message: string): boolean {
        const normalized = message.toLowerCase()
        return (
            normalized.includes('src refspec') ||
            normalized.includes('does not match any') ||
            normalized.includes('no commits')
        )
    }

    private getErrorMessage(err: unknown): string {
        if (err && typeof err === 'object') {
            const error = err as Error & { stderr?: string; stdout?: string }
            return (
                error.stderr?.toString().trim() ||
                error.stdout?.toString().trim() ||
                error.message
            )
        }
        return String(err)
    }
}

interface AccessResult {
    ok: boolean
    message?: string
}

interface PushResult {
    status: 'ok' | 'warn' | 'fail'
    message?: string
}
