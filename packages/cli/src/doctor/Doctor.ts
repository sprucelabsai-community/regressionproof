import CredentialsCheck from './checks/CredentialsCheck.js'
import JestReporterCheck from './checks/JestReporterCheck.js'
import LocalConfigCheck from './checks/LocalConfigCheck.js'
import MirrorAccessCheck from './checks/MirrorAccessCheck.js'
import DoctorContext from './DoctorContext.js'
import type { DoctorResult } from './DoctorResult.js'

export default class Doctor {
    public constructor(private context: DoctorContext) {}

    public async run(): Promise<DoctorResult[]> {
        const checks = [
            new LocalConfigCheck(),
            new JestReporterCheck(),
            new CredentialsCheck(),
            new MirrorAccessCheck(),
        ]

        const results: DoctorResult[] = []
        for (const check of checks) {
            results.push(await check.run(this.context))
        }

        return results
    }
}
