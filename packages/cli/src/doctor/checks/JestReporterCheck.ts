import JestReporterConfigInspector from '../../jest/JestReporterConfigInspector.js'
import DoctorContext from '../DoctorContext.js'
import type { DoctorResult } from '../DoctorResult.js'

export default class JestReporterCheck {
    public async run(context: DoctorContext): Promise<DoctorResult> {
        const inspector = new JestReporterConfigInspector()
        const inspection = inspector.inspect(context.cwd)

        if (!inspection.hasPackageJson) {
            return {
                name: 'Jest reporter configured',
                status: 'warn',
                details: ['No package.json found in the current directory.'],
                fix: 'Run `npx regressionproof init` from the project root.',
            }
        }

        if (inspection.isInstalled && inspection.isConfigured) {
            return {
                name: 'Jest reporter configured',
                status: 'ok',
                details: ['Reporter is installed and configured.'],
            }
        }

        const details: string[] = []
        if (!inspection.isInstalled) {
            details.push('Reporter package is not installed.')
        }
        if (!inspection.isConfigured) {
            details.push('Jest config does not include the reporter.')
        }

        return {
            name: 'Jest reporter configured',
            status: 'warn',
            details,
            fix: 'Run `npx regressionproof init` or add the reporter to your Jest config.',
        }
    }
}
