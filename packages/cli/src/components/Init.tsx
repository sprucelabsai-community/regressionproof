import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import type { RegressionProofClient } from '@regressionproof/client'
import { buildRegressionProofClient } from '@regressionproof/client'
import { Box, Text, useApp } from 'ink'
import BigText from 'ink-big-text'
import TextInput from 'ink-text-input'
import React from 'react'
import ConfigManager, { Credentials } from '../config/ConfigManager.js'
import JestConfigurator, { JestConfigResult } from '../jest/JestConfigurator.js'
import { getRepoNameFromGit, toSlug } from '../utilities/slug.js'

const API_URL =
    process.env.REGRESSIONPROOF_API_URL ?? 'https://api.regressionproof.ai'

class InitComponent extends React.Component<Props, State> {
    private checkTimeout: NodeJS.Timeout | null = null
    private apiClient: RegressionProofClient
    private configManager: ConfigManager

    public constructor(props: Props) {
        super(props)

        const providedName = props.projectName
        const defaultName = providedName ?? getRepoNameFromGit()

        this.configManager = new ConfigManager()
        this.apiClient = buildRegressionProofClient(API_URL)

        // Check if already registered (idempotent)
        const existingCreds = this.configManager.loadCredentials(defaultName)
        if (existingCreds) {
            this.state = {
                name: defaultName,
                step: 'installing',
                availability: 'available',
                errorMessage: '',
                credentials: existingCreds,
                jestConfig: null,
            }
        } else {
            this.state = {
                name: defaultName,
                step: providedName ? 'registering' : 'input',
                availability: 'idle',
                errorMessage: '',
                credentials: null,
                jestConfig: null,
            }
        }
    }

    public componentDidMount(): void {
        // If we have a provided name and not already registered, start registration
        if (this.props.projectName && this.state.step === 'registering') {
            void this.register()
        } else if (this.state.step === 'installing') {
            void this.installAndConfigure()
        } else {
            void this.checkAvailability()
        }
    }

    public componentDidUpdate(_: Props, prevState: State): void {
        if (prevState.name !== this.state.name && this.state.step === 'input') {
            void this.checkAvailability()
        }
    }

    public componentWillUnmount(): void {
        this.clearCheckTimeout()
    }

    private clearCheckTimeout(): void {
        if (this.checkTimeout) {
            clearTimeout(this.checkTimeout)
            this.checkTimeout = null
        }
    }

    private async checkAvailability(): Promise<void> {
        this.clearCheckTimeout()

        const { name } = this.state
        if (name.length < 3) {
            this.setState({ availability: 'idle', errorMessage: '' })
            return
        }

        this.setState({ availability: 'checking' })

        this.checkTimeout = setTimeout(async () => {
            try {
                const isAvailable =
                    await this.apiClient.checkNameAvailability(name)
                this.setState({
                    availability: isAvailable ? 'available' : 'taken',
                    errorMessage: '',
                })
            } catch (err) {
                this.setState({
                    availability: 'error',
                    errorMessage: this.formatError(err),
                })
            }
        }, 300)
    }

    private formatError(err: unknown): string {
        const message = err instanceof Error ? err.message : String(err)
        const cause =
            err instanceof Error && 'cause' in err ? ` (${err.cause})` : ''
        return `${message}${cause} - ${API_URL}`
    }

    private handleNameChange = (value: string): void => {
        this.setState({ name: toSlug(value) })
    }

    private handleSubmit = async (): Promise<void> => {
        const { availability, name } = this.state
        if (availability !== 'available' || name.length < 3) {
            return
        }

        this.setState({ step: 'registering' })
        await this.register()
    }

    private async register(): Promise<void> {
        const { name } = this.state

        try {
            const credentials = await this.apiClient.registerProject({ name })
            this.setState({ credentials })

            this.configManager.saveCredentials(name, credentials)
            this.configManager.writeLocalConfig(name, credentials.url)
            await this.installAndConfigure()
        } catch (err) {
            this.setState({
                step: 'error',
                errorMessage: err instanceof Error ? err.message : String(err),
            })
        }
    }

    private async installAndConfigure(): Promise<void> {
        this.setState({ step: 'installing' })
        const installResult = this.installDependencies()
        if (!installResult.success) {
            this.setState({
                step: 'error',
                errorMessage:
                    installResult.message ?? 'Failed to install dependencies.',
            })
            return
        }

        this.setState({ step: 'configuring' })
        const jestConfigurator = new JestConfigurator()
        const jestConfig = jestConfigurator.configure()
        this.setState({ jestConfig, step: 'success' })

        setTimeout(() => this.props.exit(), 3000)
    }

    private installDependencies(): InstallResult {
        if (!existsSync('package.json')) {
            return {
                success: false,
                message:
                    'No package.json found. regressionproof currently supports Node.js + Jest projects.',
            }
        }

        let packageJson: {
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
        }

        try {
            packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
                dependencies?: Record<string, string>
                devDependencies?: Record<string, string>
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            return {
                success: false,
                message: `Failed to read package.json: ${message}`,
            }
        }

        const hasReporter = Boolean(
            packageJson.dependencies?.['@regressionproof/jest-reporter'] ??
            packageJson.devDependencies?.['@regressionproof/jest-reporter']
        )
        if (hasReporter) {
            return { success: true }
        }

        const packageManager = this.getPackageManager()
        const result = spawnSync(
            packageManager.command,
            [...packageManager.args, '@regressionproof/jest-reporter'],
            {
                encoding: 'utf8',
                shell: true,
            }
        )

        if (result.error || result.status !== 0) {
            const details =
                result.stderr?.trim() ||
                result.stdout?.trim() ||
                result.error?.message
            return {
                success: false,
                message: `Failed to install dependencies${
                    details ? `: ${details}` : ''
                }`,
            }
        }

        return { success: true }
    }

    private getPackageManager(): PackageManager {
        if (existsSync('pnpm-lock.yaml')) {
            return { command: 'pnpm', args: ['add', '-D'] }
        }

        if (existsSync('yarn.lock')) {
            return { command: 'yarn', args: ['add', '-D'] }
        }

        if (existsSync('package-lock.json')) {
            return { command: 'npm', args: ['install', '-D'] }
        }

        return { command: 'npm', args: ['install', '-D'] }
    }

    private renderStatusIndicator(): React.ReactNode {
        const { availability, errorMessage } = this.state

        switch (availability) {
            case 'idle':
                return null
            case 'checking':
                return <Text color="yellow">checking...</Text>
            case 'available':
                return <Text color="green">available (press Enter)</Text>
            case 'taken':
                return <Text color="red">already taken</Text>
            case 'error':
                return <Text color="red">{errorMessage}</Text>
        }
    }

    private renderRegistering(): React.ReactElement {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="yellow">
                    Registering project "{this.state.name}"...
                </Text>
            </Box>
        )
    }

    private renderConfiguring(): React.ReactElement {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="yellow">Configuring Jest reporter...</Text>
            </Box>
        )
    }

    private renderInstalling(): React.ReactElement {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="yellow">Installing dependencies...</Text>
            </Box>
        )
    }

    private renderSuccess(): React.ReactElement {
        const { name, credentials, jestConfig } = this.state
        const configDir = this.configManager.getConfigDir(name)

        return (
            <Box flexDirection="column" padding={1}>
                <Text color="green" bold>
                    Project registered successfully!
                </Text>
                <Box marginTop={1} flexDirection="column">
                    <Text>
                        Config saved to:{' '}
                        <Text color="cyan">{configDir}/config.json</Text>
                    </Text>
                    <Text>
                        Git remote: <Text color="cyan">{credentials?.url}</Text>
                    </Text>
                    {jestConfig?.configured ? (
                        <Text>
                            Jest reporter added to:{' '}
                            <Text color="cyan">{jestConfig.location}</Text>
                        </Text>
                    ) : (
                        <Text color="yellow">
                            Could not auto-configure Jest. Add manually:
                        </Text>
                    )}
                </Box>
                {!jestConfig?.configured && (
                    <Box marginTop={1} flexDirection="column">
                        <Text color="gray">// jest.config.js</Text>
                        <Text color="gray">
                            reporters: ['default',
                            '@regressionproof/jest-reporter']
                        </Text>
                    </Box>
                )}
                <Box marginTop={1}>
                    <Text color="green">
                        Run your tests and snapshots will be captured
                        automatically!
                    </Text>
                </Box>
            </Box>
        )
    }

    private renderError(): React.ReactElement {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="red" bold>
                    Registration failed
                </Text>
                <Text color="red">{this.state.errorMessage}</Text>
            </Box>
        )
    }

    private renderInput(): React.ReactElement {
        const { name } = this.state

        return (
            <Box flexDirection="column" padding={1}>
                <BigText
                    text="regressionproof.ai"
                    font="tiny"
                    colors={['magenta', 'cyan']}
                />
                <Text color="gray">Teaching LLMs to write better code.</Text>

                <Box marginTop={1} flexDirection="column">
                    <Text bold>Project name:</Text>
                    <Box>
                        <TextInput
                            value={name}
                            onChange={this.handleNameChange}
                            onSubmit={this.handleSubmit}
                            placeholder="my-awesome-project"
                        />
                        <Box marginLeft={2}>{this.renderStatusIndicator()}</Box>
                    </Box>
                    {name.length > 0 && name.length < 3 && (
                        <Text color="gray">
                            Name must be at least 3 characters
                        </Text>
                    )}
                </Box>
            </Box>
        )
    }

    public render(): React.ReactElement {
        const { step } = this.state

        switch (step) {
            case 'registering':
                return this.renderRegistering()
            case 'installing':
                return this.renderInstalling()
            case 'configuring':
                return this.renderConfiguring()
            case 'success':
                return this.renderSuccess()
            case 'error':
                return this.renderError()
            default:
                return this.renderInput()
        }
    }
}

export default function Init(props: {
    projectName?: string
}): React.ReactElement {
    const { exit } = useApp()
    return <InitComponent exit={exit} projectName={props.projectName} />
}

type Step =
    | 'input'
    | 'registering'
    | 'installing'
    | 'configuring'
    | 'success'
    | 'error'
type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'error'

interface Props {
    exit: () => void
    projectName?: string
}

interface State {
    name: string
    step: Step
    availability: Availability
    errorMessage: string
    credentials: Credentials | null
    jestConfig: JestConfigResult | null
}

interface PackageManager {
    command: string
    args: string[]
}

interface InstallResult {
    success: boolean
    message?: string
}
