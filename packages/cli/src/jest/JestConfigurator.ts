import fs from 'fs'
import path from 'path'
import JestReporterConfigInspector from './JestReporterConfigInspector.js'

export default class JestConfigurator {
    private cwd: string
    private reporterPackage = '@regressionproof/jest-reporter'

    public constructor(cwd: string = process.cwd()) {
        this.cwd = cwd
    }

    public configure(): JestConfigResult {
        const inspector = new JestReporterConfigInspector()
        const inspection = inspector.inspect(this.cwd)
        if (inspection.isConfigured) {
            return {
                configured: true,
                location: inspection.configuredLocations[0],
            }
        }

        return (
            this.tryConfigurePackageJson() ??
            this.tryConfigureJestConfig('jest.config.ts') ??
            this.tryConfigureJestConfig('jest.config.js') ?? {
                configured: false,
                location: '',
            }
        )
    }

    private tryConfigurePackageJson(): JestConfigResult | null {
        const packageJsonPath = path.join(this.cwd, 'package.json')
        if (!fs.existsSync(packageJsonPath)) {
            return null
        }

        const packageJson = JSON.parse(
            fs.readFileSync(packageJsonPath, 'utf-8')
        )
        if (!packageJson.jest) {
            return null
        }

        if (!packageJson.jest.reporters) {
            packageJson.jest.reporters = ['default']
        }

        if (!packageJson.jest.reporters.includes(this.reporterPackage)) {
            packageJson.jest.reporters.push(this.reporterPackage)
        }

        fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJson, null, 2) + '\n'
        )

        return { configured: true, location: 'package.json' }
    }

    private tryConfigureJestConfig(filename: string): JestConfigResult | null {
        const configPath = path.join(this.cwd, filename)
        if (!fs.existsSync(configPath)) {
            return null
        }

        let content = fs.readFileSync(configPath, 'utf-8')

        if (content.includes(this.reporterPackage)) {
            return {
                configured: true,
                location: `${filename} (already configured)`,
            }
        }

        if (content.includes('reporters:')) {
            content = content.replace(
                /(reporters:\s*\[)/,
                `$1'${this.reporterPackage}', `
            )
        } else {
            const exportPattern = filename.endsWith('.ts')
                ? /(export\s+default\s*\{)/
                : /(module\.exports\s*=\s*\{)/

            content = content.replace(
                exportPattern,
                `$1\n  reporters: ['default', '${this.reporterPackage}'],`
            )
        }

        fs.writeFileSync(configPath, content)

        return { configured: true, location: filename }
    }
}

export interface JestConfigResult {
    configured: boolean
    location: string
}
