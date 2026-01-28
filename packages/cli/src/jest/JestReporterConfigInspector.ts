import fs from 'fs'
import path from 'path'

export default class JestReporterConfigInspector {
    private reporterPackage = '@regressionproof/jest-reporter'

    public inspect(cwd: string): InspectionResult {
        const packageJsonPath = path.join(cwd, 'package.json')
        const hasPackageJson = fs.existsSync(packageJsonPath)
        const packageJson = hasPackageJson
            ? this.safeReadJson(packageJsonPath)
            : null

        const isInstalled =
            Boolean(packageJson?.dependencies?.[this.reporterPackage]) ||
            Boolean(packageJson?.devDependencies?.[this.reporterPackage])

        const configuredLocations: string[] = []
        if (this.isConfiguredInPackageJson(packageJson)) {
            configuredLocations.push('package.json')
        }
        if (this.isConfiguredInFile(cwd, 'jest.config.js')) {
            configuredLocations.push('jest.config.js')
        }
        if (this.isConfiguredInFile(cwd, 'jest.config.ts')) {
            configuredLocations.push('jest.config.ts')
        }

        return {
            hasPackageJson,
            isInstalled,
            configuredLocations,
            isConfigured: configuredLocations.length > 0,
        }
    }

    private isConfiguredInPackageJson(
        packageJson: PackageJson | null
    ): boolean {
        const reporters = packageJson?.jest?.reporters ?? []
        const isConfigured =
            Array.isArray(reporters) && reporters.includes(this.reporterPackage)
        return isConfigured
    }

    private isConfiguredInFile(cwd: string, filename: string): boolean {
        const configPath = path.join(cwd, filename)
        if (!fs.existsSync(configPath)) {
            return false
        }

        try {
            const content = fs.readFileSync(configPath, 'utf-8')
            return content.includes(this.reporterPackage)
        } catch {
            return false
        }
    }

    private safeReadJson(filePath: string): PackageJson | null {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PackageJson
        } catch {
            return null
        }
    }
}

interface PackageJson {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    jest?: {
        reporters?: string[]
    }
}

export interface InspectionResult {
    hasPackageJson: boolean
    isInstalled: boolean
    configuredLocations: string[]
    isConfigured: boolean
}
