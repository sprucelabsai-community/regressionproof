import Doctor from './Doctor.js'
import DoctorContext from './DoctorContext.js'
import type { DoctorResult } from './DoctorResult.js'

export default class DoctorRunner {
    public static async run(
        options?: DoctorRunOptions
    ): Promise<DoctorResult[]> {
        const cwd = options?.cwd ?? process.cwd()
        const context = DoctorContext.fromCwd(cwd)
        return new Doctor(context).run()
    }
}

export interface DoctorRunOptions {
    cwd?: string
}
