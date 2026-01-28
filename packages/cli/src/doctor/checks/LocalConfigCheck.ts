import DoctorContext from '../DoctorContext.js'
import type { DoctorResult } from '../DoctorResult.js'

export default class LocalConfigCheck {
    public async run(context: DoctorContext): Promise<DoctorResult> {
        if (!context.localConfigPath) {
            return {
                name: 'Local project config (.regressionproof.json)',
                status: 'warn',
                details: [`Missing .regressionproof.json in ${context.cwd}.`],
                fix: 'Run `npx regressionproof init` from the project root.',
            }
        }

        return {
            name: 'Local project config (.regressionproof.json)',
            status: 'ok',
            details: [`Found at ${context.localConfigPath}.`],
        }
    }
}
