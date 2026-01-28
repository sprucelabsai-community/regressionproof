import type { DoctorResult, DoctorStatus } from './DoctorResult.js'

export default class DoctorOutput {
    public static print(results: DoctorResult[]): void {
        console.log('===================================')
        console.log('     RegressionProof Doctor')
        console.log('===================================')
        console.log('')

        for (const result of results) {
            const label = DoctorOutput.formatStatus(result.status)
            console.log(`${label} ${result.name}`)

            for (const detail of result.details) {
                console.log(`     ${detail}`)
            }

            if (result.fix) {
                console.log(`     Fix: ${result.fix}`)
            }

            console.log('')
        }
    }

    public static exitCode(results: DoctorResult[]): number {
        return results.some((result) => result.status === 'fail') ? 1 : 0
    }

    private static formatStatus(status: DoctorStatus): string {
        switch (status) {
            case 'ok':
                return 'OK  '
            case 'warn':
                return 'WARN'
            case 'fail':
                return 'FAIL'
        }
    }
}
